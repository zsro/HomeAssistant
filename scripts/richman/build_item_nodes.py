#!/usr/bin/env python3
"""Derive S2-02 point/shop sites from the reviewed Japan map audit (stdlib only)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def build(audit):
    nodes = []
    for row in audit['nodes']:
        code = row['eventCodeCandidate']
        if code not in (10, 11, 12, 15):
            continue
        if code == 15:
            assert row['target'] == dict(table='companies', id=1)
        else:
            assert row['kind'] == 0
        nodes.append(dict(id=row['id'], kind=row['kind'],
                          points={10: 50, 11: 30, 12: 10}.get(code, 0), shop=code == 15))
    return dict(version=1, mapSha256=audit['sourceFiles']['MapDat.MKF']['sha256'], nodes=nodes)


if __name__ == '__main__':
    audit = json.loads((ROOT / 'docs/richman/japan-map-audit.json').read_text())
    target = ROOT / 'shared/richman/game/japan-item-nodes.json'
    target.write_text(json.dumps(build(audit), ensure_ascii=False, indent=2) + '\n')
    print(f'Wrote {target.relative_to(ROOT)}')
