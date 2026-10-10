import json
import os
from pathlib import Path
import struct
import unittest

from audit_effects import audit, match_table, mkf_entry, parse_rows, pe_name_offset


class EffectsAuditTests(unittest.TestCase):
    def test_rows_keep_big5_names_fields_and_source_locations(self):
        rows = parse_rows('\n{ "\\xb8\\xf4\\xbb\\xd9", 10, 30, 0, 1 }')
        self.assertEqual(rows[0]['name'], '路障')
        self.assertEqual(rows[0]['rawFields'], [10, 30, 0, 1])
        self.assertEqual(rows[0]['sourceLine'], 2)
        with self.assertRaises(ValueError):
            parse_rows('{ "plain", 1, 2, 3, 4 }')

    def test_full_stride_match_does_not_accept_only_first_row(self):
        rows = [dict(rawFields=[1, 2, 3, 4]), dict(rawFields=[5, 6, 7, 8])]
        table = b'PTR1\1\2\3\4PTR2\5\6\7\10'
        self.assertEqual(match_table(b'prefix' + table, rows), [6])
        self.assertEqual(match_table(table[:-1], rows), [])
        self.assertEqual(match_table(table + table, rows), [0, 16])

    def test_pe_resolves_name_through_actual_section_and_rejects_unmapped_pointer(self):
        data = bytearray(512); data[:2] = b'MZ'; struct.pack_into('<I', data, 60, 64)
        data[64:68] = b'PE\0\0'; struct.pack_into('<H', data, 70, 1); struct.pack_into('<H', data, 84, 32)
        struct.pack_into('<H', data, 88, 0x10b); struct.pack_into('<I', data, 116, 0x400000)
        struct.pack_into('<4I', data, 128, 100, 0x1000, 100, 256)
        self.assertEqual(pe_name_offset(data, 0x401008), 264)
        for pointer in [0x400100, 0x401100]:
            with self.assertRaises(ValueError):
                pe_name_offset(data, pointer)
        for truncated in [b'', data[:140]]:
            with self.assertRaises(ValueError):
                pe_name_offset(truncated, 0x401000)

    def test_mkf_checks_directory_bounds_and_payload_without_decoding(self):
        data = struct.pack('<I4I', 24, 4, 4, 0, 0) + b'test' + struct.pack('<I', 4)
        self.assertEqual(mkf_entry(data, 0), dict(index=0, offset=4, decodedBytes=4, packedBytes=4))
        for blob, index in [(b'', 0), (data, -1), (data, 1), (data[:-1], 0), (struct.pack('<I4I', 24, 4, 999, 0, 0) + data[20:], 0)]:
            with self.assertRaises(ValueError):
                mkf_entry(blob, index)

    @unittest.skipUnless(os.environ.get('RICHMAN_GAME_DIR') and os.environ.get('RICHMAN_REFERENCE_DIR'), 'Set game/reference paths for local evidence verification')
    def test_local_inventory_matches_committed_evidence(self):
        root = Path(__file__).resolve().parents[2]
        actual = audit(Path(os.environ['RICHMAN_GAME_DIR']), Path(os.environ['RICHMAN_REFERENCE_DIR']), root / 'docs/richman/japan-map-audit.json')
        self.assertEqual(actual, json.loads((root / 'docs/richman/effects-audit.json').read_text()))
        self.assertEqual(len(actual['items']), 43)
        self.assertTrue(all(row['localNameOffset'] in row['localNameOffsets'] for row in actual['items']))
        self.assertFalse(any(row['enabled'] for row in actual['items']))
        self.assertEqual(actual['shops'][0]['nodeIds'], [50, 107])
        self.assertEqual([len(f['entries']) for f in actual['eventFamilies']], [36, 49])
        self.assertEqual(actual['unknownMapEventCodes'], [])


if __name__ == '__main__':
    unittest.main()
