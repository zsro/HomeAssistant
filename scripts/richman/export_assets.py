#!/usr/bin/env python3
"""Offline proof-of-concept asset export. Requires Pillow and NumPy; never edits the game."""
import argparse
import ctypes
import hashlib
import json
import platform
from pathlib import Path
import struct
import subprocess
import tempfile

import numpy as np
from PIL import Image


def rgb555(values, transparent=True):
    values = np.asarray(values, dtype=np.uint16)
    rgb = np.stack([((values >> 10) & 31) * 255 // 31,
                    ((values >> 5) & 31) * 255 // 31,
                    (values & 31) * 255 // 31], axis=-1).astype(np.uint8)
    if transparent:
        rgb = np.concatenate([rgb, np.where(values[..., None] != 0, 255, 0).astype(np.uint8)], axis=-1)
    return rgb


class Archive:
    def __init__(self, path, decoder):
        self.data = path.read_bytes()
        self.decoder = decoder
        offset = struct.unpack_from('<I', self.data)[0]
        assert 4 <= offset < len(self.data) and (len(self.data) - offset) % 4 == 0
        self.index = struct.unpack_from('<' + 'I' * ((len(self.data) - offset) // 4), self.data, offset)
        self.end = offset

    def read(self, index):
        pos = self.index[index]
        assert 4 <= pos and pos + 16 <= self.end
        size, packed, _, _ = struct.unpack_from('<4I', self.data, pos)
        assert 0 < size < 100_000_000 and pos + 16 + packed <= self.end
        data = self.data[pos + 16:pos + 16 + packed]
        if size != packed:
            dest = ctypes.create_string_buffer(size)
            self.decoder(dest, data, size)
            data = dest.raw
        return data

    def frames(self, index):
        data = self.read(index)
        sig, count, start = struct.unpack_from('<4sII', data)
        assert sig in (b'SPR\0', b'SMP\0') and start >= 12 + count * 12
        indexed = sig == b'SPR\0'
        palette = rgb555(np.frombuffer(data, '<u2', 256, start)) if indexed else None
        offset = start + (512 if indexed else 0)
        frames = []
        for i in range(count):
            w, h, ax, ay, size = struct.unpack_from('<hhhhI', data, 12 + i * 12)
            assert w > 0 and h > 0 and size == w * h * (1 if indexed else 2)
            assert offset + size <= len(data)
            raw = np.frombuffer(data, 'u1' if indexed else '<u2', w * h, offset).reshape(h, w)
            pixels = palette[raw] if indexed else rgb555(raw)
            frames.append((Image.fromarray(pixels), ax, ay))
            offset += size
        return frames


def export(game, output, decoder):
    output.mkdir(parents=True, exist_ok=True)
    data = Archive(game / 'Data.mkf', decoder)
    maps = Archive(game / 'map.mkf', decoder)
    metadata = Archive(game / 'MapDat.MKF', decoder).read(2)
    # GND: palette, tile indices, 32x32 indexed tiles; map 2 is Japan.
    ground = maps.read(4)
    w, h, _ = struct.unpack_from('<HHI', ground, 4)
    palette = rgb555(np.frombuffer(ground, '<u2', 256, 16), False)
    indices = np.frombuffer(ground, '<u2', w * h, 528)
    tiles = np.frombuffer(ground, 'u1', offset=528 + w * h * 2).reshape(-1, 32, 32)
    assert indices.max() < len(tiles)
    pixels = tiles[indices].reshape(h, w, 32, 32).transpose(0, 2, 1, 3).reshape(h * 32, w * 32)
    Image.fromarray(palette[pixels]).save(output / 'japan.webp', lossless=True)
    Image.fromarray(palette[pixels]).resize((320, 320)).save(output / 'japan-mini.webp', quality=85)
    nn, no, nl, lo, _, _, _, _, ns, so = struct.unpack_from('<10I', metadata)
    lands = []
    for i in range(1, nl + 1):
        p = lo + i * 52
        x, y = struct.unpack_from('<HH', metadata, p)
        label = metadata[p + 4:p + 20].split(b'\0')[0].decode('big5')
        lands.append(dict(id=i, x=x, y=y, name=label))
    nodes = []
    for i in range(1, nn + 1):
        p = no + i * 40
        x, y = struct.unpack_from('<hh', metadata, p)
        adjacent = [v for v in struct.unpack_from('<4H', metadata, p + 24) if v]
        kind = struct.unpack_from('<H', metadata, p + 32)[0]
        label = lands[kind - 2001]['name'] if 2001 <= kind <= 2000 + nl else '道路'
        nodes.append(dict(id=i, x=x, y=y, adjacent=adjacent, kind=kind, name=label))
    assert all(v in range(1, nn + 1) for n in nodes for v in n['adjacent'])
    # Preserve the stored edge direction; this Japan fixture has reciprocal edges.
    visited, queue = set(), [1]
    while queue:
        i = queue.pop()
        if i in visited:
            continue
        visited.add(i)
        queue.extend(nodes[i - 1]['adjacent'])
    assert len(visited) == nn

    sprites = {}
    images = []
    def add(key, frame):
        im, ax, ay = frame
        images.append((key, im))
        sprites[key] = dict(width=im.width, height=im.height, anchorX=ax, anchorY=ay)
        return key

    characters = []
    # Original base-game resource IDs; the expansion's IDs differ.
    for cid, name, base_id, portrait, color in [
        ('xiaomei', '孙小美', 276, 24, '#c45a48'),
        ('tuu', '阿土伯', 171, 19, '#477855'),
        ('chyan', '钱夫人', 150, 18, '#866094'),
        ('salonbus', '沙隆巴斯', 108, 16, '#b5853f'),
    ]:
        standing = [add(f'{cid}-idle-{i}', f) for i, f in enumerate(data.frames(base_id))]
        walking = [add(f'{cid}-walk-{i}', f) for i, f in enumerate(data.frames(base_id + 1))]
        assert len(standing) == 8 and len(walking) % 8 == 0
        maps.frames(portrait)[0][0].save(output / f'{cid}.webp', lossless=True)
        characters.append(dict(id=cid, name=name, color=color, idle=standing, walk=walking,
                               walkFramesPerDirection=len(walking) // 8,
                               resourceIds=[base_id, base_id + 1]))

    # Candidate Japanese residential tiers 1..5, all original orientation frames.
    # Land level 0 is empty; ownership is rendered from the game state, never scenery.
    scenery = []
    for level, rid in enumerate(range(32, 37), 1):
        frames = maps.frames(rid)
        assert len(frames) == 8
        for direction, frame in enumerate(frames):
            add(f'house-{level}-{direction}', frame)
    landmark_resources = {'醫院': 87, '監獄': 122, '東照宮': 123, '東京': 128,
                          '京都': 126, '大阪城': 132, '神戶': 125, '宮島': 127,
                          '阿蘇山': 124, '富士山': 133, '松島': 131}
    for i in range(1, ns + 1):
        p = so + i * 28
        x, y = struct.unpack_from('<HH', metadata, p)
        name = metadata[p + 4:p + 24].split(b'\0')[0].decode('big5')
        if name not in landmark_resources:
            continue
        rid = landmark_resources[name]
        key = f'landmark-{rid}'
        if key not in sprites:
            add(key, maps.frames(rid)[0])
        scenery.append(dict(x=x, y=y, sprite=key, name=name))

    # Simple padded shelf atlas, anchors are retained separately from packed rectangles.
    width, x, y, row = 2048, 2, 2, 0
    for key, im in images:
        if x + im.width + 2 > width:
            x, y, row = 2, y + row + 4, 0
        sprites[key].update(x=x, y=y)
        x += im.width + 4
        row = max(row, im.height)
    height = y + row + 2
    atlas = Image.new('RGBA', (width, height))
    for key, im in images:
        atlas.paste(im, (sprites[key]['x'], sprites[key]['y']))
    atlas.save(output / 'sprites.webp', lossless=True)
    manifest = dict(version=1, propertyArtVersion=1, map=dict(name='日本', width=w * 32, height=h * 32, nodes=nodes,
                                       lands=lands, scenery=scenery), characters=characters, sprites=sprites,
                    sourceHashes={n: hashlib.sha256((game / n).read_bytes()).hexdigest()
                                  for n in ['Data.mkf', 'map.mkf', 'MapDat.MKF']})
    (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')))
    total = sum(p.stat().st_size for p in output.iterdir() if p.is_file())
    print(f'Exported {len(sprites)} sprites, {nn} nodes, {len(scenery)} scenery objects; {total / 1024**2:.2f} MiB')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--game', required=True, type=Path, help='Game directory containing MKF files')
    parser.add_argument('--output', type=Path, default=Path('frontend/public/richman/generated'))
    args = parser.parse_args()
    vendor = Path(__file__).parent / 'vendor'
    with tempfile.TemporaryDirectory(prefix='rich4-export-') as temp:
        dylib = Path(temp) / 'decoder.dylib'
        flags = ['-dynamiclib'] if platform.system() == 'Darwin' else ['-shared', '-fPIC']
        subprocess.run(['cc', *flags, '-O2', str(vendor / 'mkf_decompress.c'), '-o', str(dylib)], check=True)
        lib = ctypes.CDLL(str(dylib))
        lib.mkf_decompress.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_size_t]
        export(args.game, args.output, lib.mkf_decompress)


if __name__ == '__main__':
    main()
