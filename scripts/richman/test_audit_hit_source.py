import json
from pathlib import Path
import struct
import unittest
from audit_hit_source import describe_graph


def sample(sig=b'SPR\0'):
    bpp = 1 if sig == b'SPR\0' else 2
    return struct.pack('<4sIIHHhhI', sig, 1, 24, 2, 2, -1, 1, 4*bpp) + bytes(512 if bpp == 1 else 0) + bytes(4*bpp)


class HitSourceTests(unittest.TestCase):
    def test_8bit_and_16bit_are_not_interchangeable(self):
        self.assertTrue(describe_graph(sample())['byteMaskCompatible'])
        self.assertFalse(describe_graph(sample(b'SMP\0'))['byteMaskCompatible'])
        self.assertFalse(describe_graph(sample())['semanticMappingConfirmed'])
        self.assertEqual(describe_graph(sample())['frames'][0]['anchorX'], -1)

    def test_malformed_header_and_frames_fail_closed(self):
        for data in [b'', sample()[:-1], sample()+b'\0', b'BAD\0'+sample()[4:]]:
            with self.assertRaises(ValueError):
                describe_graph(data)

    def test_recorded_local_resource_blocks_unverified_mask_mapping(self):
        report = json.loads((Path(__file__).resolve().parents[2] / 'docs/richman/s2-02d-local-hit-audit.json').read_text())
        self.assertEqual((report['signature'], report['frameCount'], report['bytesPerPixel']), ('SMP', 7, 2))
        self.assertFalse(report['byteMaskCompatible'])
        self.assertFalse(report['semanticMappingConfirmed'])
        self.assertEqual(report['resourceSha256'], 'a2340ba620ba41519cb63da6d6d1f785366d0945855e8917836868f10998a2b4')


if __name__ == '__main__':
    unittest.main()
