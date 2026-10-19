import json
from pathlib import Path
import struct
import tempfile
import unittest

from PIL import Image
from export_ui import export, native_evidence, pe_slice, sha, toolbar_manifest
from ui_catalog import LAYOUT, SELECTION, SOURCE_HASHES

REPO = Path(__file__).resolve().parents[2]


def sample_pe():
    data = bytearray(1024)
    struct.pack_into('<I', data, 0x3C, 0x80)
    data[0x80:0x84] = b'PE\0\0'
    struct.pack_into('<H', data, 0x86, 1)
    struct.pack_into('<H', data, 0x94, 224)
    struct.pack_into('<I', data, 0x80 + 24 + 28, 0x400000)
    struct.pack_into('<4I', data, 0x80 + 24 + 224 + 8, 512, 0x1000, 128, 512)
    data[512:516] = b'ABCD'
    return data


class UiExportTests(unittest.TestCase):
    def test_pe_mapping_rejects_bss_and_outside_file(self):
        data = sample_pe()
        self.assertEqual(pe_slice(data, 0x401000, 4), (512, b'ABCD'))
        for va, size in [(0x400FFF, 4), (0x40107F, 2), (0x401100, 1)]:
            with self.assertRaises(ValueError):
                pe_slice(data, va, size)
        with self.assertRaises(ValueError):
            pe_slice(data[:513], 0x401000, 4)

    def test_unknown_source_fails_before_writing_outputs(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            game = root / 'game'
            game.mkdir()
            (game / 'Data.mkf').write_bytes(b'unaudited-version')
            with self.assertRaisesRegex(ValueError, 'Unaudited source version'):
                export(game, root / 'out', root / 'evidence', root / 'audit.json')
            self.assertFalse((root / 'out').exists())
            self.assertFalse((root / 'audit.json').exists())

    def test_cannot_export_into_original_game(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            with self.assertRaisesRegex(ValueError, 'original game directory'):
                export(root, root / 'ui', root / 'evidence', root / 'audit.json')

    def test_hover_art_does_not_change_hit_rect_or_invent_states(self):
        frames = [(Image.new('RGBA', (439, 40)), 0, 0)]
        frames += [(Image.new('RGBA', (20, 20)), 10, 10)] * 11
        frames += [(Image.new('RGBA', (46, 42)), 23, -3)] * 11
        buttons = toolbar_manifest(frames)
        self.assertEqual(buttons[-1]['hitRect'], [400, 0, 40, 40])
        self.assertEqual(buttons[0]['states']['hover']['drawRect'], [-3, 23, 46, 42])
        self.assertIsNone(buttons[0]['states']['disabled'])
        self.assertEqual([b['id'] for b in buttons[3:5]], ['load', 'save'])

    def test_expansion_or_truncated_toolbar_is_rejected(self):
        with self.assertRaises(ValueError):
            toolbar_manifest([])

    def test_layout_covers_logical_canvas_without_overlap(self):
        pixels = set()
        for region in LAYOUT:
            x, y, w, h = region['rect']
            area = {(a, b) for a in range(x, x + w) for b in range(y, y + h)}
            self.assertFalse(pixels & area)
            pixels |= area
        self.assertEqual(len(pixels), 640 * 480)
        self.assertTrue(all(0 <= x < 640 and 0 <= y < 480 for x, y in pixels))

    def test_recorded_audit_preserves_provenance_and_unknowns(self):
        report = json.loads((REPO / 'docs/richman/original-ui-resource-audit.json').read_text())
        self.assertFalse(report['runtimeIntegrated'])
        self.assertFalse(report['coverage']['nativeExecutableExecuted'])
        self.assertFalse(report['coverage']['allArchiveRecordsSemanticallyAudited'])
        self.assertEqual({name: info['sha256'] for name, info in report['sources'].items()}, SOURCE_HASHES)
        selected = {(name, i) for name, ids in SELECTION.items() for i in ids}
        self.assertEqual({(r['archive'], r['index']) for r in report['resources']}, selected)
        for span in report['nativeEvidence']:
            data = bytes.fromhex(span['hex'])
            self.assertEqual(len(data), span['bytes'])
            self.assertEqual(sha(data), span['sha256'])
        self.assertEqual(report['go']['initialRect'], [180, 120, 72, 67])
        self.assertEqual(report['go']['maskValues'], [1, 2, 3, 4])

    def test_native_evidence_rejects_mutated_jump_table(self):
        # Build a minimal PE using recorded evidence, not the proprietary executable.
        report = json.loads((REPO / 'docs/richman/original-ui-resource-audit.json').read_text())
        data = sample_pe()
        data.extend(bytes(0x74000))
        struct.pack_into('<4I', data, 0x80 + 24 + 224 + 8, 0x73000, 0x1000, 0x73000, 512)
        for span in report['nativeEvidence']:
            pos = int(span['virtualAddress'], 16) - 0x401000 + 512
            raw = bytes.fromhex(span['hex'])
            data[pos:pos + len(raw)] = raw
        native_evidence(data)
        data[0x417536 - 0x401000 + 512] ^= 1
        with self.assertRaisesRegex(ValueError, 'jump table changed'):
            native_evidence(data)


if __name__ == '__main__':
    unittest.main()
