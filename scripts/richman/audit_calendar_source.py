"""Read-only fixed-commit blob and Japanese holiday-table verification.
Usage: python3 scripts/richman/audit_calendar_source.py --tree TREE --asm ASM
Numeric data only; never writes extracted code/resources into the frontend.
"""
import argparse, hashlib, json, re, struct
from pathlib import Path

def audit(tree_path, asm_path):
    tree = json.loads(Path(tree_path).read_text())
    expected = next(x['sha'] for x in tree['tree'] if x['path'] == 'asm/rich4.asm')
    raw = Path(asm_path).read_bytes()
    blob = hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
    assert blob == expected, (blob, expected)
    lines = raw.decode().split('ref_0047ff4a:\n', 1)[1].splitlines()
    table = bytearray()
    for line in lines:
        text = line.split(';')[0].strip()
        if not text or text.endswith(':'):
            continue
        match = re.fullmatch(r'(db|dd) (0x[\da-fA-F]+)', text)
        assert match, text
        size = 1 if match[1] == 'db' else 4
        table.extend(int(match[2], 16).to_bytes(size, 'little'))
        if len(table) >= 3*288:
            break
    rows = [dict(slot=i, closed=table[576+i*12], kind=table[577+i*12], month=table[578+i*12], day=table[579+i*12]) for i in range(24)]
    current = json.loads(Path('frontend/src/features/richman/game/calendar-japan.json').read_text())
    assert rows == current
    assert all(r['kind'] == 0 and r['closed'] in [0, 1] for r in rows)
    assert sum(r['closed'] for r in rows) == 15
    constants = {}
    for name in ['00464e88', '00464ea0']:
        data = raw.decode().split('ref_'+name+':\n', 1)[1].splitlines()[:2]
        value = b''.join(int(x.split()[1], 16).to_bytes(4, 'little') for x in data)
        constants[name] = struct.unpack('<d', value)[0]
    assert constants == {'00464e88': 1.1, '00464ea0': 0.1}
    return {'commit': tree['sha'], 'gitBlobSha1': blob, 'sha256': hashlib.sha256(raw).hexdigest(), 'table': '0047ff4a + (stage0*4 + Japan2)*288; 24*12 bytes', 'rows': rows, 'constants': constants}

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--tree', required=True)
    p.add_argument('--asm', required=True)
    a = p.parse_args()
    print(json.dumps(audit(a.tree, a.asm), ensure_ascii=False, indent=2))
