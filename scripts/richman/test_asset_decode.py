"""Regression for indexed transparency, including opaque RGB555 black."""
import struct
import unittest
from export_assets import Archive


class AssetDecodeTests(unittest.TestCase):
    def test_spr_transparency_uses_index_zero_not_black_rgb(self):
        archive = object.__new__(Archive)
        palette = [0] * 256
        palette[2] = 0x7fff
        blob = (struct.pack('<4sII', b'SPR\0', 1, 24) + struct.pack('<hhhhI', 3, 1, -2, 9, 3)
                + struct.pack('<256H', *palette) + bytes([0, 1, 2]))
        archive.read = lambda _: blob
        image, ax, ay = archive.frames(0)[0]
        self.assertEqual(list(image.getdata()), [(0, 0, 0, 0), (0, 0, 0, 255), (255, 255, 255, 255)])
        self.assertEqual((ax, ay), (-2, 9))


if __name__ == '__main__':
    unittest.main()
