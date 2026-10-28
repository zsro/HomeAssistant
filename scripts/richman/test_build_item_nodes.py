import json
from pathlib import Path
import unittest
from build_item_nodes import build

ROOT = Path(__file__).resolve().parents[2]


class RuntimeItemSitesTest(unittest.TestCase):
    def test_reproduces_exact_sites_from_original_map_audit(self):
        audit = json.loads((ROOT / 'docs/richman/japan-map-audit.json').read_text())
        actual = json.loads((ROOT / 'shared/richman/game/japan-item-nodes.json').read_text())
        self.assertEqual(build(audit), actual)
        self.assertEqual(len(actual['nodes']), 15)
        self.assertEqual([n['id'] for n in actual['nodes'] if n['shop']], [50, 107])
        self.assertEqual(sum(n['points'] > 0 for n in actual['nodes']), 13)

    def test_does_not_silently_map_a_different_shop(self):
        audit = json.loads((ROOT / 'docs/richman/japan-map-audit.json').read_text())
        audit['nodes'][49]['target']['id'] = 2
        with self.assertRaises(AssertionError):
            build(audit)
