"""Map artwork coverage and drawing-field regressions against the audited local map."""
import json
from pathlib import Path
import unittest
from map_art import map_art_plan, property_art


class MapArtTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.audit = json.loads((Path(__file__).resolve().parents[2] / 'docs/richman/japan-map-audit.json').read_text())
        cls.plan = map_art_plan(cls.audit)

    def test_all_drawing_nodes_are_present_including_empty_event_and_prison_exit(self):
        roads = {r['nodeId']: r for r in self.plan['roadTiles']}
        self.assertEqual(len(roads), 43)
        self.assertEqual(set(roads), {n['id'] for n in self.audit['nodes'] if n['word22']})
        self.assertEqual([roads[n]['frame'] for n in [2, 19, 45, 66]], [2] * 4)
        self.assertEqual([roads[n]['frame'] for n in [79, 80, 81, 82, 83, 84]], [11, 16, 11, 16, 10, 16])

    def test_drawing_id_is_not_event_code(self):
        roads = {r['nodeId']: r for r in self.plan['roadTiles']}
        self.assertEqual(roads[24]['frame'], 7)  # event code 7, drawing ID 8
        self.assertEqual(roads[26]['frame'], 6)  # event code 8, drawing ID 7
        self.assertEqual({r['frame'] for r in roads.values()}, set(range(17)))

    def test_companies_and_unnamed_scenery_are_not_filtered_out(self):
        companies = [r for r in self.plan['scenery'] if r['table'] == 'companies']
        landmarks = [r for r in self.plan['scenery'] if r['table'] == 'landmarks']
        self.assertEqual([r['resource'] for r in companies], [80, 82, 77, 78, 76, 84])
        self.assertEqual(len(landmarks), 16)
        self.assertEqual(len([r for r in landmarks if not r['name']]), 4)
        self.assertEqual(next(r for r in landmarks if r['name'] == '東京')['resource'], 131)
        self.assertEqual(next(r for r in landmarks if r['name'] == '富士山')['resource'], 128)

    def test_scenery_and_facility_orientation_comes_from_records(self):
        self.assertEqual(self.plan['propertyDirections']['japan:facility:2'], 7)
        self.assertEqual(self.plan['scenery'][0]['frame'], 5)
        hospital = next(r for r in self.plan['scenery'] if r['name'] == '醫院')
        self.assertEqual(hospital['frame'], 1)

    def test_all_supported_building_types_have_distinct_art(self):
        art = property_art()
        self.assertEqual([art[f'house-{n}'] for n in range(1, 6)], list(range(37, 42)))
        self.assertEqual(art['chain'], 47)
        self.assertEqual([art[f'facility-{t}-1'] for t in range(5)], [48, 49, 54, 59, 64])
        self.assertEqual([art[f'facility-{t}-5'] for t in [1, 2, 4]], [53, 58, 68])


if __name__ == '__main__':
    unittest.main()
