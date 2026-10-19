"""Export UI-06's additional event window assets from the audited local game."""
import argparse
import ctypes
import platform
import subprocess
import tempfile
from pathlib import Path
from export_ui import verify_sources, sha, write_json, contact_sheets, pe_slice
from export_assets import Archive
from audit_hit_source import describe_graph

ROOT = Path(__file__).resolve().parents[2]
def export(game):
    sources = verify_sources(game)
    output = ROOT / 'frontend/public/richman/generated/ui'
    evidence = ROOT / 'docs/richman/ui06'
    evidence.mkdir(parents=True, exist_ok=True)
    resources = []
    with tempfile.TemporaryDirectory(prefix='richman-ui06-') as temp:
        library = Path(temp) / 'decoder.dylib'
        flags = ['-dynamiclib'] if platform.system() == 'Darwin' else ['-shared', '-fPIC']
        subprocess.run(['cc', *flags, '-O2', str(ROOT / 'scripts/richman/vendor/mkf_decompress.c'), '-o', str(library)], check=True)
        decoder = ctypes.CDLL(str(library))
        decoder.mkf_decompress.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_size_t]
        archive = Archive(game / 'Panel.mkf', decoder.mkf_decompress)
        for index in [18, 66]:
            raw = archive.read(index)
            graph = describe_graph(raw)
            frames = archive.frames(index)
            key = f'Panel-{index}'
            (output / key).mkdir(parents=True, exist_ok=True)
            for meta, (im, _, _) in zip(graph['frames'], frames):
                relative = f'{key}/{meta["index"]:03d}.png'
                im.save(output / relative)
                meta.update(path=relative, rgbaSha256=sha(im.tobytes()), pngSha256=sha((output / relative).read_bytes()))
            resources.append(dict(id=key, archive='Panel.mkf', index=index, resourceSha256=sha(raw), graph=graph,
                                  contactSheets=contact_sheets(key, frames, evidence)))
    if verify_sources(game) != sources:
        raise ValueError('Source changed during export')
    exe = (game / 'rich4.exe').read_bytes()
    spans = []
    for key, start, end, note in [
        ('magic-load', 0x432BEE, 0x432BFA, 'Magic house loads Panel[18].'),
        ('auction-load', 0x43AEAE, 0x43AEBA, 'Auction loads Panel[26], already exported in UI-00.'),
        ('news-load', 0x44A189, 0x44A195, 'News loads shared Panel[66]; frame 0 NEWS border.'),
        ('fortune-load', 0x44C4B6, 0x44C4C2, 'Fortune loads shared Panel[66]; frame 1 question-mark border.'),
    ]:
        offset, data = pe_slice(exe, start, end - start)
        spans.append(dict(id=key, start=hex(start), end=hex(end), fileOffset=offset, hex=data.hex(), sha256=sha(data), note=note))
    write_json(evidence / 'additional-assets.json', dict(sources=sources, resources=resources, nativeEvidence=spans,
        referenceCommit='ec7d70e693059d1e781d9d1cc2ad7f36d360d39e',
        runtimeBoundary='Static resource/call inspection only; no original executable run.'))
    print('Exported UI-06 event window assets; originals unchanged')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--game', type=Path, required=True)
    export(parser.parse_args().game)
