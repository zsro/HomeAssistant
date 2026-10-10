import json
from pathlib import Path
import tempfile
import unittest
from build_worker_projection import build, data_at, OUTPUT

SOURCE = Path('/private/tmp/rich4-tools-audit/rich4-master/asm/rich4.asm')

class ProjectionTests(unittest.TestCase):
    def test_parser_fails_closed(self):
        self.assertEqual(data_at('ref_1:\ndb 0xff\nref_2:\ndw 0x1234\n', 'ref_1', 3), b'\xff\x34\x12')
        for text in ['ref_1:\nmov eax, 0', 'ref_1:\ndb 0x00', 'ref_1:\nref_1:\ndd 0x00']:
            with self.assertRaises(ValueError):
                data_at(text, 'ref_1', 4)

    def test_rejects_unpinned_source(self):
        with tempfile.NamedTemporaryFile() as f:
            f.write(b'not the audited reference'); f.flush()
            with self.assertRaisesRegex(ValueError, 'SHA-256'):
                build(f.name)

    @unittest.skipUnless(SOURCE.exists(), 'Pinned reference not available locally')
    def test_exact_regeneration(self):
        result = build(SOURCE)
        self.assertEqual(result, json.loads(OUTPUT.read_text()))
        self.assertEqual(result['coefficients'], [-34, 11, -14, -25])
        self.assertEqual(len(result['yx']), 841)
        self.assertEqual(result['yx'][14 * 29 + 14], [0, 0])
        self.assertEqual(result['yx'][14 * 29 + 15], [-11, 34])
        self.assertEqual(result['yx'][15 * 29 + 14], [25, 14])

if __name__ == '__main__':
    unittest.main()
