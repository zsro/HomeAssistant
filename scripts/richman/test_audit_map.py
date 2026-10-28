"""Format boundary checks, plus optional read-only verification against the supplied game."""
import json
import os
from pathlib import Path
import struct
import unittest

from audit_map import TABLES, audit, parse_map


def fixture():
    counts = (4, 2, 1, 0, 0)
    header, offset = [], 40
    for count, (_, stride) in zip(counts, TABLES):
        header.extend([count, offset])
        offset += (count + 1) * stride
    data = bytearray(offset)
    struct.pack_into('<10I', data, 0, *header)
    for node, kind in enumerate([2001, 2002, 4001, 4001], 1):
        p = header[1] + node * 40
        struct.pack_into('<hh', data, p, node * 10, 20)
        # Deliberately one-way ring: the parser must not invent reverse edges.
        struct.pack_into('<4H', data, p + 24, node % 4 + 1, 0, 0, 0)
        struct.pack_into('<H', data, p + 32, kind)
        struct.pack_into('<I', data, p + 36, 0x123400 + node)
    for land in (1, 2):
        p = header[3] + land * 52
        data[p + 4:p + 8] = '東京'.encode('big5')
        struct.pack_into('<8H', data, p + 28, 2500, 500, 500, 1200, 3000, 7500, 16000, 30000)
    return data, header


class MapParserTests(unittest.TestCase):
    def test_one_based_ids_and_same_name_lands_remain_distinct(self):
        data, header = fixture()
        result = parse_map(data)
        self.assertEqual([r['nodeIds'] for r in result['lands']], [[1], [2]])
        self.assertEqual([r['name'] for r in result['lands']], ['東京', '東京'])
        self.assertEqual(result['lands'][0]['offset'], header[3] + 52)
        self.assertEqual(result['lands'][0]['word1c'], 2500)
        self.assertEqual(result['lands'][0]['word1e'], 500)
        self.assertEqual(result['lands'][0]['words20to2a'], [500, 1200, 3000, 7500, 16000, 30000])

    def test_multi_node_facility_and_directional_graph_are_preserved(self):
        result = parse_map(fixture()[0])
        self.assertEqual(result['facilities'][0]['nodeIds'], [3, 4])
        self.assertEqual(result['summary']['oneWayEdges'], [[1, 2], [2, 3], [3, 4], [4, 1]])
        self.assertEqual(result['nodes'][0]['statusBits'], 0x123401)
        self.assertEqual(result['nodes'][0]['eventCodeCandidate'], 1)

    def test_rejects_truncated_header_and_last_table(self):
        for data in (b'', fixture()[0][:-1]):
            with self.assertRaises(ValueError):
                parse_map(data)

    def test_rejects_overlapping_sections(self):
        data, header = fixture()
        struct.pack_into('<I', data, 12, header[1])
        with self.assertRaisesRegex(ValueError, 'Overlapping'):
            parse_map(data)

    def test_rejects_out_of_bounds_count(self):
        data, _ = fixture()
        struct.pack_into('<I', data, 0, 0xffffffff)
        with self.assertRaisesRegex(ValueError, 'invalid count'):
            parse_map(data)

    def test_rejects_dangling_land_and_road_references(self):
        for offset, value, message in ((32, 2003, 'lands reference'), (24, 5, 'adjacent node')):
            data, header = fixture()
            struct.pack_into('<H', data, header[1] + 40 + offset, value)
            with self.assertRaisesRegex(ValueError, message):
                parse_map(data)

    def test_preserves_unknown_kind_without_inventing_a_land(self):
        data, header = fixture()
        struct.pack_into('<H', data, header[1] + 40 + 32, 8001)
        result = parse_map(data)
        self.assertIsNone(result['nodes'][0]['target'])
        self.assertEqual(result['summary']['unclassifiedKinds'], [8001])
        self.assertEqual(result['summary']['unboundRecords']['lands'], [1])

    def test_rejects_disconnected_nodes(self):
        data, header = fixture()
        struct.pack_into('<H', data, header[1] + 40 + 24, 1)
        with self.assertRaisesRegex(ValueError, 'unreachable'):
            parse_map(data)

    @unittest.skipUnless(os.environ.get('RICHMAN_GAME_DIR'), 'Set RICHMAN_GAME_DIR for local asset verification')
    def test_local_game_matches_committed_audit_and_existing_topology(self):
        root = Path(__file__).resolve().parents[2]
        result = audit(Path(os.environ['RICHMAN_GAME_DIR']))
        saved = json.loads((root / 'docs/richman/japan-map-audit.json').read_text())
        # JSON normalizes integer Counter keys to strings.
        self.assertEqual(json.loads(json.dumps(result)), saved)
        topology = json.loads((root / 'shared/richman/japan-topology.fixture.json').read_text())
        for actual, old in zip(result['nodes'], topology, strict=True):
            self.assertEqual({k: actual[k] for k in ('id', 'x', 'y', 'adjacent', 'kind')},
                             {k: old[k] for k in ('id', 'x', 'y', 'adjacent', 'kind')})
        self.assertEqual(result['summary']['counts'], dict(nodes=110, lands=49, facilities=5, companies=6, landmarks=16))
        self.assertEqual(result['lands'][5]['word1c'], 500)  # 仙台三号地与同街其他地块不同。
        self.assertEqual(result['lands'][3]['word1c'], 800)
        self.assertFalse(result['reference']['versionMatchesLocalExe'])


if __name__ == '__main__':
    unittest.main()
