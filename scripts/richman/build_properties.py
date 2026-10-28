#!/usr/bin/env python3
"""Build a small runtime property catalog from the reviewed S1-01 audit (stdlib only)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def build(audit):
    properties = []
    for section, kind in [('lands', 'land'), ('facilities', 'facility')]:
        for row in audit[section]:
            assert row['ownerByte'] == row['levelByte'] == row['byte18'] == 0
            properties.append(dict(id=f'japan:{kind}:{row["id"]}', kind=kind,
                                   name=row['name'], nodeIds=row['nodeIds'], x=row['x'], y=row['y'],
                                   direction=row['byte1b'] if kind == 'land' else 0,
                                   basePrice=row['word1c' if kind == 'land' else 'word22'],
                                   upgradeCost=row['word1e' if kind == 'land' else 'word24'],
                                   rents=row['words20to2a' if kind == 'land' else 'words26to2e']))
    return dict(version=1, evidence='cross-version-candidate',
                sourceHash=audit['sourceFiles']['MapDat.MKF']['sha256'],
                resourceHash=audit['resourceSha256'], referenceCommit=audit['reference']['commit'],
                initialFunds=audit['exeTableCandidates']['initialFunds']['values'], properties=properties)


if __name__ == '__main__':
    audit = json.loads((ROOT / 'docs/richman/japan-map-audit.json').read_text())
    target = ROOT / 'shared/richman/game/japan-properties.json'
    target.write_text(json.dumps(build(audit), ensure_ascii=False, indent=2) + '\n')
    print(f'Wrote {target.relative_to(ROOT)}')
