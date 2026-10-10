#!/usr/bin/env python3
"""Read-only S1 map audit. Raw offsets are authoritative; rule meanings remain candidates."""
import argparse
from collections import Counter
import ctypes
import hashlib
import json
from pathlib import Path
import platform
import struct
import subprocess
import tempfile


TABLES = (('nodes', 40), ('lands', 52), ('facilities', 56),
          ('companies', 52), ('landmarks', 28))
REFERENCE_COMMIT = 'ec7d70e693059d1e781d9d1cc2ad7f36d360d39e'
REFERENCE_EXE_SHA256 = '5a90aee28ee5f7a5c3ba5cb935c9e55751a529c25fcd91208748a66293569550'
EXE_TABLE_CANDIDATES = {
    'initialFunds': [300000, 200000, 100000, 50000, 30000, 10000],
    'dayLimits': [0, 730, 365, 182, 91, 30],
    'wealthMultipliers': [0, 100, 50, 10, 5, 3],
}


def parse_map(data: bytes) -> dict:
    """Parse the five one-based tables; reject truncated or dangling records."""
    if len(data) < 40:
        raise ValueError('Map header is truncated')
    header = struct.unpack_from('<10I', data)
    sections = {}
    intervals = []
    for index, (name, stride) in enumerate(TABLES):
        count, offset = header[index * 2:index * 2 + 2]
        end = offset + (count + 1) * stride  # Each table includes unused record zero.
        if count > 10000 or offset < 40 or end > len(data):
            raise ValueError(f'{name}: invalid count, offset or truncated table')
        sections[name] = dict(count=count, offset=offset, stride=stride, end=end)
        intervals.append((offset, end, name))
    for left, right in zip(sorted(intervals), sorted(intervals)[1:]):
        if left[1] > right[0]:
            raise ValueError(f'Overlapping tables: {left[2]} and {right[2]}')
    if sections['nodes']['count'] == 0:
        raise ValueError('Map has no nodes')

    tables = {}
    for name, stride in TABLES:
        rows = []
        for index in range(1, sections[name]['count'] + 1):
            offset = sections[name]['offset'] + index * stride
            raw = data[offset:offset + stride]
            row = dict(id=index, offset=offset, x=struct.unpack_from('<h', raw)[0],
                       y=struct.unpack_from('<h', raw, 2)[0], rawHex=raw.hex())
            if name == 'nodes':
                slots = list(struct.unpack_from('<4H', raw, 0x18))
                kind = struct.unpack_from('<H', raw, 0x20)[0]
                bits = struct.unpack_from('<I', raw, 0x24)[0]
                row.update(adjacentSlots=slots, adjacent=[v for v in slots if v],
                           kind=kind, word22=struct.unpack_from('<H', raw, 0x22)[0],
                           statusBits=bits, eventCodeCandidate=bits & 0xff, target=None)
                for low, high, target in ((2000, 4000, 'lands'), (4000, 6000, 'facilities'),
                                          (6000, 8000, 'companies')):
                    if low < kind < high:
                        target_id = kind - low
                        if target_id > sections[target]['count']:
                            raise ValueError(f'Node {index}: dangling {target} reference {target_id}')
                        row['target'] = dict(table=target, id=target_id)
                if any(v > sections['nodes']['count'] for v in row['adjacent']):
                    raise ValueError(f'Node {index}: dangling adjacent node')
                if not row['adjacent']:
                    raise ValueError(f'Node {index}: no exits')
            else:
                row['name'] = raw[4:20].split(b'\0')[0].decode('big5')
                row['nodeIds'] = []
                if name in ('lands', 'facilities'):
                    row.update(byte18=raw[0x18], ownerByte=raw[0x19], levelByte=raw[0x1a],
                               byte1b=raw[0x1b])
                    if name == 'lands':
                        row.update(byte17=raw[0x17], word1c=struct.unpack_from('<H', raw, 0x1c)[0],
                                   word1e=struct.unpack_from('<H', raw, 0x1e)[0],
                                   words20to2a=list(struct.unpack_from('<6H', raw, 0x20)))
                    else:
                        row.update(byte1c=raw[0x1c], word22=struct.unpack_from('<H', raw, 0x22)[0],
                                   word24=struct.unpack_from('<H', raw, 0x24)[0],
                                   words26to2e=list(struct.unpack_from('<5H', raw, 0x26)))
                elif name == 'companies':
                    row.update(byte18=raw[0x18], byte19=raw[0x19], byte1a=raw[0x1a],
                               word22=struct.unpack_from('<H', raw, 0x22)[0])
                else:
                    row.update(word18=struct.unpack_from('<H', raw, 0x18)[0],
                               word1a=struct.unpack_from('<H', raw, 0x1a)[0])
            rows.append(row)
        tables[name] = rows

    for node in tables['nodes']:
        target = node['target']
        if target:
            tables[target['table']][target['id'] - 1]['nodeIds'].append(node['id'])
    reached, pending = set(), [1]
    while pending:
        current = pending.pop()
        if current not in reached:
            reached.add(current)
            pending.extend(tables['nodes'][current - 1]['adjacent'])
    if len(reached) != len(tables['nodes']):
        raise ValueError('Some nodes are unreachable from node 1')
    one_way = [[node['id'], target] for node in tables['nodes'] for target in node['adjacent']
               if node['id'] not in tables['nodes'][target - 1]['adjacent']]
    summary = dict(
        counts={name: section['count'] for name, section in sections.items()},
        reachableNodes=len(reached), oneWayEdges=one_way,
        nodeTargets=dict(sorted(Counter(node['target']['table'] if node['target'] else
                                       ('unbound' if node['kind'] == 0 else 'unclassified')
                                       for node in tables['nodes']).items())),
        eventCodeCandidates=dict(sorted(Counter(node['eventCodeCandidate'] for node in tables['nodes']).items())),
        unclassifiedKinds=sorted({node['kind'] for node in tables['nodes'] if node['kind'] and not node['target']}),
        unboundRecords={name: [row['id'] for row in tables[name] if not row['nodeIds']]
                        for name in ('lands', 'facilities', 'companies')},
        initialPropertyBytes={name: {field: sorted({row[field] for row in tables[name]})
                                    for field in ('ownerByte', 'levelByte', 'byte18')}
                              for name in ('lands', 'facilities')},
    )
    return dict(sections=sections, summary=summary, **tables)


def audit(game: Path) -> dict:
    # Import only for the CLI; parser tests require only the standard library.
    from export_assets import Archive
    vendor = Path(__file__).parent / 'vendor'
    with tempfile.TemporaryDirectory(prefix='rich4-audit-') as temp:
        library = Path(temp) / 'decoder.dylib'
        flags = ['-dynamiclib'] if platform.system() == 'Darwin' else ['-shared', '-fPIC']
        subprocess.run(['cc', *flags, '-O2', str(vendor / 'mkf_decompress.c'), '-o', str(library)], check=True)
        decoder = ctypes.CDLL(str(library))
        decoder.mkf_decompress.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_size_t]
        resource = Archive(game / 'MapDat.MKF', decoder.mkf_decompress).read(2)
    result = parse_map(resource)
    files = {}
    for name in ('MapDat.MKF', 'rich4.exe'):
        content = (game / name).read_bytes()
        files[name] = dict(bytes=len(content), sha256=hashlib.sha256(content).hexdigest())
    executable = (game / 'rich4.exe').read_bytes()
    exe_tables = {}
    for name, values in EXE_TABLE_CANDIDATES.items():
        needle = struct.pack('<6I', *values)
        offsets, start = [], 0
        while (offset := executable.find(needle, start)) >= 0:
            offsets.append(offset)
            start = offset + 1
        exe_tables[name] = dict(values=values, fileOffsets=offsets,
                                meaningStatus='candidate; byte match does not prove runtime behavior')
    return dict(schemaVersion=1, mapId='japan', resourceIndex=2,
                sourceFiles=files, resourceSha256=hashlib.sha256(resource).hexdigest(), exeTableCandidates=exe_tables,
                reference=dict(repository='https://github.com/mytbk/rich4', commit=REFERENCE_COMMIT,
                               exeSha256=REFERENCE_EXE_SHA256,
                               versionMatchesLocalExe=files['rich4.exe']['sha256'] == REFERENCE_EXE_SHA256,
                               meaningStatus='candidate-until-local-behavior-verified'),
                **result)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--game', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    # Audit output must not modify the original installation, even by an accidental flag.
    if args.output.resolve().is_relative_to(args.game.resolve().parent):
        parser.error('Output must be outside the original installation')
    result = audit(args.game)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result['summary'], ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
