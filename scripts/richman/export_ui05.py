"""Export UI-05's additional inventory/business assets from the audited local game."""
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
    evidence = ROOT / 'docs/richman/ui05'
    evidence.mkdir(parents=True, exist_ok=True)
    resources = []
    with tempfile.TemporaryDirectory(prefix='richman-ui05-') as temp:
        library = Path(temp) / 'decoder.dylib'
        flags = ['-dynamiclib'] if platform.system() == 'Darwin' else ['-shared', '-fPIC']
        subprocess.run(['cc', *flags, '-O2', str(ROOT / 'scripts/richman/vendor/mkf_decompress.c'), '-o', str(library)], check=True)
        decoder = ctypes.CDLL(str(library))
        decoder.mkf_decompress.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_size_t]
        archive = Archive(game / 'Panel.mkf', decoder.mkf_decompress)
        for index in [11, 12, 63, 65, 71, 73, 75, 76]:
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
        ('insurance-wheel-load', 0x43F585, 0x43F5AC, 'Panel[68 + (argument & 3)]; insurance passes 3, selecting Panel[71].'),
        ('insurance-wheel-entry', 0x41A259, 0x41A261, 'Insurance invokes wheel with argument 3.'),
        ('inventory-load', 0x44696A, 0x446987, 'Tool inventory opens Panel archive, loads Panel[11].'),
        ('card-inventory-load', 0x440819, 0x440837, 'Card inventory loads Panel[11]; reference use_card renders names into slots.'),
        ('shop-load', 0x42DE2D, 0x42DE50, 'Shop loads Panel[10] scene and Panel[11] inventory.'),
        ('lottery-load', 0x4309D7, 0x4309F5, 'Lottery loads Panel[12].'),
        ('sale-load', 0x427AA8, 0x427AB7, 'Sale loads Panel[73].'),
        ('stock-chart-load', 0x42B03A, 0x42B049, 'Stock chart loads Panel[76].'),
        ('stock-load', 0x42AB10, 0x42AB1F, 'Stock loads Panel[75].'),
        ('prison-load', 0x43C084, 0x43C093, 'Prison loads Panel[63].'),
        ('hospital-load', 0x43D705, 0x43D714, 'Hospital loads Panel[65].'),
    ]:
        offset, data = pe_slice(exe, start, end - start)
        spans.append(dict(id=key, start=hex(start), end=hex(end), fileOffset=offset, hex=data.hex(), sha256=sha(data), note=note))
    write_json(evidence / 'additional-assets.json', dict(sources=sources, resources=resources, nativeEvidence=spans,
        referenceCommit='ec7d70e693059d1e781d9d1cc2ad7f36d360d39e',
        runtimeBoundary='Static resource/call inspection only; no original executable run.'))
    print('Exported UI-05 inventory/business assets; originals unchanged')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--game', type=Path, required=True)
    export(parser.parse_args().game)
