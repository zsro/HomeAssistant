#!/usr/bin/env python3
"""Read-only effect inventory. Byte facts are not proof of runtime semantics."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import struct

COMMIT = 'ec7d70e693059d1e781d9d1cc2ad7f36d360d39e'
SOURCES = ['csrc/cards.c', 'csrc/card.h', 'csrc/cards_ui.c', 'csrc/tools_ui.c',
           'csrc/game_init.c', 'csrc/fortune.c', 'csrc/news.c', 'asm/rich4_tool_table.c',
           'asm/tool.h', 'asm/rich4_tool_utils.c', 'asm/rich4_shop.asm',
           'asm/rich4_player_info.h', 'asm/rich4_player_core_actions.asm',
           'asm/rich4_card_zhuanxiangka.c']


def sha(data):
    return hashlib.sha256(data).hexdigest()


def offsets(data, needle):
    result, start = [], 0
    while (start := data.find(needle, start)) >= 0:
        result.append(start)
        start += 1
    return result


def parse_rows(source):
    rows = []
    pattern = r'\{ "([^"]+)", (\d+), (\d+), (\d+), (\d+) \}'
    for match in re.finditer(pattern, source):
        raw = match[1]
        if re.sub(r'\\x[0-9a-fA-F]{2}', '', raw):
            raise ValueError('Expected explicit Big5 bytes')
        name = bytes(int(v, 16) for v in re.findall(r'\\x([0-9a-fA-F]{2})', raw))
        rows.append(dict(name=name.decode('big5'), nameHex=name.hex(), rawFields=list(map(int, match.group(2, 3, 4, 5))),
                         sourceLine=source[:match.start()].count('\n') + 1))
    if not rows:
        raise ValueError('Empty source table')
    return rows


def match_table(data, rows):
    tails = [bytes(row['rawFields']) for row in rows]
    return [pos - 4 for pos in offsets(data, tails[0]) if pos >= 4 and
            all(data[pos + i * 8:pos + i * 8 + 4] == tail for i, tail in enumerate(tails))]



def pe_name_offset(data, pointer):
    """Resolve a PE32 absolute pointer via section raw ranges, never by a guessed delta."""
    if len(data) < 64 or data[:2] != b'MZ':
        raise ValueError('Invalid DOS header')
    pe = struct.unpack_from('<I', data, 0x3c)[0]
    if pe + 24 > len(data) or data[pe:pe + 4] != b'PE\0\0':
        raise ValueError('Invalid PE header')
    count = struct.unpack_from('<H', data, pe + 6)[0]
    optional = struct.unpack_from('<H', data, pe + 20)[0]
    section = pe + 24 + optional
    if optional < 32 or section + count * 40 > len(data) or struct.unpack_from('<H', data, pe + 24)[0] != 0x10b:
        raise ValueError('Invalid PE32 sections')
    base = struct.unpack_from('<I', data, pe + 52)[0]
    rva = pointer - base
    matches = []
    for index in range(count):
        _, start, size, offset = struct.unpack_from('<4I', data, section + index * 40 + 8)
        if offset and start <= rva < start + size:
            location = offset + rva - start
            if location < len(data):
                matches.append(location)
    if len(matches) != 1:
        raise ValueError('Unmapped or ambiguous PE pointer')
    return matches[0]


def mkf_entry(data, index):
    if len(data) < 4:
        raise ValueError('Truncated MKF')
    end = struct.unpack_from('<I', data)[0]
    if not 4 <= end < len(data) or (len(data) - end) % 4:
        raise ValueError('Invalid MKF directory')
    count = (len(data) - end) // 4
    if not 0 <= index < count:
        raise ValueError('Invalid MKF index')
    pos = struct.unpack_from('<I', data, end + index * 4)[0]
    if not 4 <= pos <= end - 16:
        raise ValueError('Invalid MKF record')
    size, packed, _, _ = struct.unpack_from('<4I', data, pos)
    if not size or not packed or pos + 16 + packed > end:
        raise ValueError('Truncated MKF payload')
    return dict(index=index, offset=pos, decodedBytes=size, packedBytes=packed)


def audit(game, reference, map_audit):
    exe = (game / 'rich4.exe').read_bytes()
    sources = {name: (reference / name).read_bytes() for name in SOURCES}
    result = dict(schemaVersion=1, referenceCommit=COMMIT,
                  semantics='B: cross-version candidates; A: local bytes only; C: unknown; no enabled game effects',
                  sources=[dict(path=name, sha256=sha(data), url=f'https://github.com/mytbk/rich4/blob/{COMMIT}/{name}') for name, data in sources.items()],
                  localExe=dict(bytes=len(exe), sha256=sha(exe)), items=[])
    for kind, source, count in [('card', 'csrc/cards.c', 30), ('tool', 'asm/rich4_tool_table.c', 13)]:
        rows = parse_rows(sources[source].decode())
        if len(rows) != count:
            raise ValueError(f'Unexpected {kind} count')
        matches = match_table(exe, rows)
        if len(matches) != 1:
            raise ValueError(f'Ambiguous or absent local {kind} table: {matches}')
        for index, row in enumerate(rows, 1):
            row.update(id=f'{kind}:{index:02}', originalId=index, kind=kind, source=source,
                       localRecordOffset=matches[0] + (index - 1) * 8,
                       localNameOffsets=offsets(exe, bytes.fromhex(row['nameHex']) + b'\0'),
                       priceCandidate=row['rawFields'][1], currencyCandidate='points', enabled=False,
                       timing=None, target=None, consumption=None, cancellation=None, duration=None, conflict=None)
            pointer = struct.unpack_from('<I', exe, row['localRecordOffset'])[0]
            row['localNameOffset'] = pe_name_offset(exe, pointer)
            if row['localNameOffset'] not in row['localNameOffsets']:
                raise ValueError('Local table name pointer does not match source identity')
            result['items'].append(row)
    candidates = {
        'card:06': dict(target='selected player/special actor; mask restrictions still unknown', consumption='one card after nonzero selection', cancellation='zero selection returns without consumption', duration='instant direction change', source='csrc/cards.c:turn_back_card; asm/rich4_card_zhuanxiangka.c'),
        'card:14': dict(target='selected player/special actor', consumption='one card after nonzero selection', cancellation='zero selection returns without consumption', duration='self raw days_stopping=0x80; other=1, countdown unknown', source='csrc/cards.c:stop_card'),
        'card:15': dict(target='other eligible players and special actors, excludes hotel etc.', consumption='one card at entry', cancellation=None, duration='raw winter_sleep=5 and clears sleep_walking; includes additional financial call', source='csrc/cards.c:winter_sleep_card'),
        'card:30': dict(target='selected player/special actor', consumption='one card after nonzero selection', cancellation='zero selection returns without consumption', duration='self raw days=2; other/special raw days=3; countdown not verified', source='csrc/cards.c:tortoise_walking_card'),
    }
    for row in result['items']:
        row['behaviorCandidate'] = candidates.get(row['id'])
    metadata = json.loads(map_audit.read_text())
    result['mapAuditSha256'] = sha(map_audit.read_bytes())
    labels = ['property', 'no-op', 'news', 'fortune', 'prison', 'hospital', 'penguin-game', 'balloon-game',
              'falling-gifts-game', 'lottery', 'points-50', 'points-30', 'points-10', 'random-card', 'bank', 'shop', 'magic-house-candidate']
    result['mapEvents'] = [dict(code=code, candidate=label, source='asm/rich4_player_core_actions.asm:ref_004197e9',
        nodeIds=[n['id'] for n in metadata['nodes'] if n['eventCodeCandidate'] == code],
        timing='landing-candidate', enabled=code in (0, 14),
        implementationScope='ordinary lands only' if code == 0 else 'S1 basic bank' if code == 14 else 'not implemented') for code, label in enumerate(labels)]
    unknown = sorted({n['eventCodeCandidate'] for n in metadata['nodes']} - set(range(len(labels))))
    result['unknownMapEventCodes'] = unknown
    result['inventoryCandidates'] = dict(cardSlots=15, toolsPerKind=9, sharedCardPool=True, sharedToolPoolIds=list(range(1, 9)),
        source='csrc/cards.c:consume_a_card; asm/rich4_tool_utils.c:rich4_receive_tool',
        initialDeal='unverified; csrc/game_init.c calls tool grants before character initialization', enabled=False)
    result['shops'] = [dict(id='japan:company:1', name=metadata['companies'][0]['name'], nodeIds=[n['id'] for n in metadata['nodes'] if n['kind'] == 6001],
        eventCode=15, currency='points-candidate', priceField='item table byte +5', saleRatio=None,
        source='asm/rich4_shop.asm:_rich4_player_buy_card/_rich4_player_buy_tool', enabled=False)]
    fortune = sources['csrc/fortune.c'].decode().split('fortune_data_idx[49] = {', 1)[1].split('};', 1)[0]
    indices = [int(n, 16) for n in re.findall(r'0x[0-9a-f]+', fortune)]
    if len(indices) != 49:
        raise ValueError('Unexpected fortune mapping')
    data = (game / 'Data.mkf').read_bytes()
    result['dataArchive'] = dict(bytes=len(data), sha256=sha(data))
    result['eventFamilies'] = []
    for family, entries, source in [('news', list(range(441, 477)), 'csrc/news.c:news_events'), ('fortune', indices, 'csrc/fortune.c:fortune_data_idx')]:
        result['eventFamilies'].append(dict(id=family, source=source, selection=None, priority=None, enabled=False,
            entries=[dict(id=f'{family}:{i:02}', resource=mkf_entry(data, index), effect=None, target=None, duration=None) for i, index in enumerate(entries)]))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--game', type=Path, required=True)
    parser.add_argument('--reference', type=Path, required=True)
    parser.add_argument('--map-audit', type=Path, default=Path('docs/richman/japan-map-audit.json'))
    parser.add_argument('--output', type=Path, default=Path('docs/richman/effects-audit.json'))
    args = parser.parse_args()
    args.output.write_text(json.dumps(audit(args.game, args.reference, args.map_audit), ensure_ascii=False, indent=2) + '\n')
