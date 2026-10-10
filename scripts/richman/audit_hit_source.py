"""Inspect only the reference hit-shape entry MAP.MKF[26]; do not guess substitute entries."""
import argparse
import ctypes
import hashlib
import json
from pathlib import Path
import platform
import struct
import subprocess
import tempfile


def describe_graph(data):
    if len(data) < 12:
        raise ValueError('Truncated graph header')
    sig, count, start = struct.unpack_from('<4sII', data)
    if sig not in (b'SPR\0', b'SMP\0') or not 1 <= count <= 256 or start < 12 + count * 12:
        raise ValueError('Invalid graph header')
    indexed = sig == b'SPR\0'
    cursor = start + (512 if indexed else 0)
    if cursor > len(data):
        raise ValueError('Truncated graph data')
    frames = []
    for i in range(count):
        w, h, ax, ay, size = struct.unpack_from('<HHhhI', data, 12 + i * 12)
        if not w or not h or size != w * h * (1 if indexed else 2) or cursor + size > len(data):
            raise ValueError('Invalid/truncated graph frame')
        frames.append(dict(index=i, width=w, height=h, anchorX=ax, anchorY=ay, bytes=size))
        cursor += size
    if cursor != len(data):
        raise ValueError('Unexplained trailing graph data')
    return dict(signature=sig.rstrip(b'\0').decode(), frameCount=count, bytesPerPixel=1 if indexed else 2, frames=frames,
                byteMaskCompatible=indexed, semanticMappingConfirmed=False)


def audit(game):
    from export_assets import Archive
    vendor = Path(__file__).parent / 'vendor/mkf_decompress.c'
    with tempfile.TemporaryDirectory(prefix='rich4-hit-source-') as temp:
        library = Path(temp) / 'decoder.dylib'
        flags = ['-dynamiclib'] if platform.system() == 'Darwin' else ['-shared', '-fPIC']
        subprocess.run(['cc', *flags, '-O2', str(vendor), '-o', str(library)], check=True)
        decoder = ctypes.CDLL(str(library))
        decoder.mkf_decompress.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_size_t]
        archive = Archive(game / 'map.mkf', decoder.mkf_decompress)
        data = archive.read(26)
        return dict(schemaVersion=1, source='map.mkf', index=26, archiveSha256=hashlib.sha256(archive.data).hexdigest(),
                    resourceSha256=hashlib.sha256(data).hexdigest(), resourceBytes=len(data), **describe_graph(data))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--game', required=True, type=Path)
    parser.add_argument('--output', type=Path, default=Path('docs/richman/s2-02d-local-hit-audit.json'))
    args = parser.parse_args()
    args.output.write_text(json.dumps(audit(args.game), ensure_ascii=False, indent=2) + '\n')
    print('Inspected only map.mkf[26]; metadata report written to', args.output)
