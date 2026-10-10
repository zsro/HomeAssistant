"""Extract only orientation 0's target projection; never infer pixel hit eligibility."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import struct

SOURCE_SHA256 = '30904cbb4f23a6b74fc1b80ad023bd7dff11b441c2c1978f768f9891d099d64a'
COMMIT = 'ec7d70e693059d1e781d9d1cc2ad7f36d360d39e'
OUTPUT = Path(__file__).resolve().parents[2] / 'frontend/src/features/richman/game/worker-projection.json'


def data_at(source, label, size):
    marker = label + ':\n'
    if source.count(marker) != 1:
        raise ValueError('Source label must be unique: ' + label)
    result = bytearray()
    for line in source.split(marker, 1)[1].splitlines():
        line = line.split(';', 1)[0].strip()
        if not line or re.fullmatch(r'ref_[0-9a-f]+:', line):
            continue
        match = re.fullmatch(r'(db|dw|dd) (0x[0-9a-f]+)', line)
        if not match:
            raise ValueError('Unexpected data instruction: ' + line)
        result.extend(int(match[2], 16).to_bytes({'db': 1, 'dw': 2, 'dd': 4}[match[1]], 'little'))
        if len(result) >= size:
            return bytes(result[:size])
    raise ValueError('Truncated table')


def build(path):
    raw = Path(path).read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_SHA256:
        raise ValueError('Reference source SHA-256 mismatch')
    source = raw.decode()
    table = struct.unpack('<1682h', data_at(source, 'ref_0046ccf0', 29 * 29 * 4))
    coefficients = list(struct.unpack('4b', data_at(source, 'ref_00474910', 4)))
    return {'schemaVersion': 1, 'sourceCommit': COMMIT, 'sourceSha256': SOURCE_SHA256,
            'orientation': 0, 'width': 440, 'gridSize': 29, 'cellSize': 32,
            'coefficients': coefficients,
            'yx': [list(table[i:i+2]) for i in range(0, len(table), 2)]}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', help='Pinned asm/rich4.asm')
    parser.add_argument('--output', type=Path, default=OUTPUT)
    args = parser.parse_args()
    args.output.write_text(json.dumps(build(args.source), ensure_ascii=False, separators=(',', ':')) + '\n')
