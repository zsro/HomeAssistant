import json
from pathlib import Path
import unittest
from build_properties import build

ROOT = Path(__file__).resolve().parents[2]


class RuntimePropertiesTest(unittest.TestCase):
    def test_runtime_catalog_is_reproducible_from_audit(self):
        audit = json.loads((ROOT / 'docs/richman/japan-map-audit.json').read_text())
        actual = json.loads((ROOT / 'frontend/src/features/richman/game/japan-properties.json').read_text())
        self.assertEqual(build(audit), actual)
        self.assertEqual(len(actual['properties']), 54)
        refs = [node for p in actual['properties'] for node in p['nodeIds']]
        self.assertEqual(len(refs), len(set(refs)))
        self.assertEqual(len(refs), 59)

    def test_nonempty_initial_ownership_is_not_silently_discarded(self):
        audit = json.loads((ROOT / 'docs/richman/japan-map-audit.json').read_text())
        audit['lands'][0]['ownerByte'] = 1
        with self.assertRaises(AssertionError):
            build(audit)
