#!/usr/bin/env python3
"""UI-00 read-only source audit and deterministic PNG/contact-sheet export.

Requires Python, Pillow, NumPy and a C compiler, like export_assets.py.
Never runs the original executable or fetches reference code from the network.
"""
import argparse
import ctypes
import hashlib
import json
import math
import platform
from pathlib import Path
import struct
import subprocess
import tempfile

from PIL import Image, ImageDraw

from audit_hit_source import describe_graph
from export_assets import Archive
from ui_catalog import (CHARACTERS, LAYOUT, NATIVE_SPANS, REFERENCES, REFERENCE_COMMIT,
                        SELECTION, SOURCE_HASHES, TOOLBAR)

REPO = Path(__file__).resolve().parents[2]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def verify_sources(game):
    result = {}
    for name, expected in SOURCE_HASHES.items():
        data = (game / name).read_bytes()
        actual = sha(data)
        if actual != expected:
            raise ValueError(f'Unaudited source version: {name}; expected {expected}, got {actual}')
        result[name] = dict(bytes=len(data), sha256=actual)
    return result


def pe_slice(data, va, size):
    """Map a virtual address into an on-disk PE section; reject unbacked/BSS bytes."""
    pe = struct.unpack_from('<I', data, 0x3C)[0]
    if data[pe:pe + 4] != b'PE\0\0':
        raise ValueError('Invalid PE signature')
    count = struct.unpack_from('<H', data, pe + 6)[0]
    opt_size = struct.unpack_from('<H', data, pe + 20)[0]
    base = struct.unpack_from('<I', data, pe + 24 + 28)[0]
    for i in range(count):
        section = pe + 24 + opt_size + i * 40
        _, rva, raw_size, raw = struct.unpack_from('<4I', data, section + 8)
        offset = va - base - rva
        if raw and 0 <= offset and offset + size <= raw_size:
            pos = raw + offset
            if pos + size <= len(data):
                return pos, data[pos:pos + size]
    raise ValueError(f'Unbacked PE address: {va:#x}+{size}')


def native_evidence(exe):
    result = []
    for key, start, end, note in NATIVE_SPANS:
        offset, data = pe_slice(exe, start, end - start)
        result.append(dict(id=key, virtualAddress=f'0x{start:08x}', fileOffset=offset,
                           bytes=len(data), hex=data.hex(), sha256=sha(data), interpretation=note))
    _, table = pe_slice(exe, 0x417536, 44)
    if list(struct.unpack('<11I', table)) != [b[2] for b in TOOLBAR]:
        raise ValueError('Toolbar jump table changed')
    # Check the actual call target in each straight-line branch, not only table order.
    for i, (_, _, branch, target) in enumerate(TOOLBAR):
        call = branch + (4 if i == 0 else 2 if i in (1, 3, 10) else 0)
        _, instruction = pe_slice(exe, call, 5)
        if instruction[0] != 0xE8 or call + 5 + struct.unpack_from('<i', instruction, 1)[0] != target:
            raise ValueError(f'Toolbar call target changed: {i}')
    _, xy = pe_slice(exe, 0x47310C, 8)
    if struct.unpack('<ii', xy) != (180, 120):
        raise ValueError('GO initial coordinate changed')
    return result


def toolbar_manifest(frames):
    if len(frames) != 23 or frames[0][0].size != (439, 40):
        raise ValueError('Unexpected toolbar layout')
    buttons = []
    for i, (key, label, branch, target) in enumerate(TOOLBAR):
        center = [i * 40 + 20, 20]
        states = {}
        for state, index in [('normal', i + 1), ('hover', i + 12)]:
            im, ax, ay = frames[index]
            states[state] = dict(frame=index, drawRect=[center[0] - ax, center[1] - ay, im.width, im.height])
        buttons.append(dict(id=key, label=label, index=i, hitRect=[40 * i, 0, 40, 40],
                            center=center, states={**states, 'pressed': None, 'selected': None, 'disabled': None},
                            nativeBranch=f'0x{branch:08x}', nativeCall=f'0x{target:08x}',
                            semanticEvidence='native-static-structure+reference-symbols',
                            reference=REFERENCES['toolbarDispatch']))
    return buttons


def contact_sheets(key, frames, directory):
    """Paginate at 24 frames; preserve aspect ratio, label dimensions and signed anchors."""
    pages = []
    for start in range(0, len(frames), 24):
        group = frames[start:start + 24]
        sheet = Image.new('RGB', (800, 40 + 172 * math.ceil(len(group) / 4)), '#19252b')
        draw = ImageDraw.Draw(sheet)
        draw.text((12, 12), f'{key} | frames {start}..{start + len(group) - 1} | inspection, not gameplay', fill='white')
        for local, (im, ax, ay) in enumerate(group):
            x, y = local % 4 * 200, 40 + local // 4 * 172
            draw.rectangle((x + 2, y + 2, x + 197, y + 168), fill='#35464e')
            preview = im.copy()
            preview.thumbnail((188, 132), Image.Resampling.NEAREST)
            sheet.paste(preview, (x + (200 - preview.width) // 2, y + 4), preview)
            draw.text((x + 7, y + 138), f'{start + local}: {im.width}x{im.height}', fill='white')
            draw.text((x + 7, y + 153), f'anchor ({ax},{ay})', fill='#bcd5df')
        name = f'{key}-sheet-{start // 24 + 1:02d}.png'
        sheet.save(directory / name)
        pages.append(name)
    return pages


def draw_baseline(cache, evidence_dir):
    """Resource composition only: no game scene, dynamic labels or native screenshot invented."""
    canvas = Image.new('RGBA', (640, 480), '#263b42')
    draw = ImageDraw.Draw(canvas)
    for x in range(0, 440, 40):
        draw.line((x, 40, x, 479), fill='#39515b')
    for y in range(40, 480, 40):
        draw.line((0, y, 439, y), fill='#39515b')
    draw.text((25, 250), 'MAP PLACEHOLDER (0,40,440,440)', fill='white')
    for key, frame, xy in [('Panel-1', 0, (0, 0)), ('Panel-0', 0, (440, 0)),
                           ('Panel-2', 0, (440, 280)), ('Panel-7', 0, (180, 120))]:
        im = cache[key][frame][0]
        canvas.alpha_composite(im, xy)
    for i in range(11):
        im, ax, ay = cache['Panel-1'][i + 1]
        canvas.alpha_composite(im, (i * 40 + 20 - ax, 20 - ay))
    # Initial pedestrian dice selector, reference drawing.c fcn_417191, not rolled result.
    im, ax, ay = cache['Panel-7'][7]
    canvas.alpha_composite(im, (187 - ax, 146 - ay))
    canvas.convert('RGB').save(evidence_dir / 'main-layout-composition.png')
    annotated = Image.new('RGB', (1000, 580), '#111e27')
    annotated.paste(canvas.convert('RGB'), (20, 55))
    draw = ImageDraw.Draw(annotated)
    draw.text((20, 15), 'UI-00 | 640x480 RESOURCE RECONSTRUCTION | NOT A NATIVE GAMEPLAY SCREENSHOT', fill='white')
    colors = ['#ffb657', '#69d3e9', '#b6dd7c', '#ebadff']
    for region, color in zip(LAYOUT, colors):
        x, y, w, h = region['rect']
        draw.rectangle((20 + x, 55 + y, 19 + x + w, 54 + y + h), outline=color, width=2)
    for i, (region, color) in enumerate(zip(LAYOUT, colors)):
        draw.text((690, 75 + i * 60), region['id'].upper(), fill=color)
        draw.text((690, 94 + i * 60), str(region['rect']), fill='white')
    for y, line in enumerate([
        'GO: default (180,120), 72x67', 'Movable in original EXE',
        'Toolbar: 11 x 40px hit boxes', 'Art width: 439px; no stretch',
        'Right panels: sample frame only', 'Fields / modes: unresolved',
        'Map grid: placeholder only',
    ]):
        draw.text((690, 330 + 25 * y), line, fill='#d3e2eb')
    draw.text((20, 552), 'Native rectangles verified statically. No business fields, map scene or running state reconstructed.', fill='#d3e2eb')
    annotated.save(evidence_dir / 'main-layout-annotated.png')


def export(game, output, evidence_dir, audit_path):
    for path in [output, evidence_dir, audit_path]:
        if path.resolve() == game.resolve() or game.resolve() in path.resolve().parents:
            raise ValueError('Output must not be inside the original game directory')
    sources = verify_sources(game)  # Fail closed before native decoder and before writing output.
    evidence = native_evidence((game / 'rich4.exe').read_bytes())
    output.mkdir(parents=True, exist_ok=True)
    evidence_dir.mkdir(parents=True, exist_ok=True)
    resources, inventory, cache, pages = [], {}, {}, []
    with tempfile.TemporaryDirectory(prefix='rich4-ui00-') as temp:
        library = Path(temp) / 'decoder.dylib'
        flags = ['-dynamiclib'] if platform.system() == 'Darwin' else ['-shared', '-fPIC']
        subprocess.run(['cc', *flags, '-O2', str(Path(__file__).parent / 'vendor/mkf_decompress.c'), '-o', str(library)], check=True)
        decoder = ctypes.CDLL(str(library))
        decoder.mkf_decompress.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_size_t]
        archives = {name: Archive(game / name, decoder.mkf_decompress) for name in SELECTION}
        for name, archive in archives.items():
            inventory[name] = []
            for index, offset in enumerate(archive.index):
                unpacked, packed, _, _ = struct.unpack_from('<4I', archive.data, offset)
                inventory[name].append(dict(index=index, offset=offset, packedBytes=packed, decodedBytes=unpacked,
                                            selected=index in SELECTION[name]))
            for index, (role, level, note) in SELECTION[name].items():
                raw = archive.read(index)
                graph = describe_graph(raw)
                frames = archive.frames(index)
                key = f'{Path(name).stem}-{index}'
                cache[key] = frames
                frame_dir = output / key
                frame_dir.mkdir(exist_ok=True)
                for meta, (im, _, _) in zip(graph['frames'], frames):
                    relative = f'{key}/{meta["index"]:03d}.png'
                    im.save(output / relative)
                    meta.update(path=relative, rgbaSha256=sha(im.tobytes()), pngSha256=sha((output / relative).read_bytes()))
                sheets = contact_sheets(key, frames, evidence_dir)
                pages.extend(sheets)
                resources.append(dict(id=key, archive=name, index=index, role=role, evidence=level, note=note,
                                      resourceSha256=sha(raw), graph=graph, contactSheets=sheets))
        panel = archives['Panel.mkf']
        raw = panel.read(8)
        width, height = cache['Panel-7'][0][0].size
        if len(raw) != width * height or set(raw) != {1, 2, 3, 4}:
            raise ValueError('Unexpected GO hit mask')
        mask = Image.new('RGB', (width, height))
        colors = [(45, 55, 65), (255, 190, 80), (80, 210, 220), (210, 100, 200), (90, 100, 110)]
        mask.putdata([colors[v] for v in raw])
        mask.resize((width * 4, height * 4), Image.Resampling.NEAREST).save(evidence_dir / 'go-hit-mask.png')
        (output / 'go-hit-mask.bin').write_bytes(raw)
        non_graphs = [dict(archive='Panel.mkf', index=i, bytes=len(panel.read(i)),
                           sha256=sha(panel.read(i)), type='raw-mask' if i == 8 else 'unresolved-non-graph')
                      for i in [4, 5, 6, 8]]
        character_sheet = Image.new('RGB', (800, 300), '#35464e')
        draw = ImageDraw.Draw(character_sheet)
        maps = Archive(game / 'map.mkf', decoder.mkf_decompress)
        character_audit = []
        for n, c in enumerate(CHARACTERS):
            x = n * 200
            draw.text((x + 10, 10), c['id'], fill='white')
            assets = [('body', archives['Data.mkf'].frames(c['body'])[0]),
                      ('portrait', maps.frames(c['portrait'])[0]),
                      ('menu-icon', cache['Data-2'][c['characterIndex']])]
            hashes = {}
            for row, (label, (im, ax, ay)) in enumerate(assets):
                character_sheet.paste(im, (x + 80, 35 + row * 85), im)
                draw.text((x + 5, 65 + row * 85), label, fill='white')
                hashes[label] = dict(width=im.width, height=im.height, anchorX=ax, anchorY=ay, rgbaSha256=sha(im.tobytes()))
            character_audit.append({**c, 'assets': hashes, 'status': 'visual-match; native-name-to-resource-table-not-fully-traced'})
        character_sheet.save(evidence_dir / 'current-characters.png')
    buttons = toolbar_manifest(cache['Panel-1'])
    draw_baseline(cache, evidence_dir)
    index_lines = ['# UI-00 联系表', '',
                   '由 `scripts/richman/export_ui.py` 生成；缩略图保持比例，标注原尺寸和锚点。',
                   '主界面图为资源组合示意，地图使用占位网格，不是原版运行截图。', '',
                   '- [主界面标注图](main-layout-annotated.png)',
                   '- [无标注的资源组合图](main-layout-composition.png)',
                   '- [现用四名角色对照](current-characters.png)',
                   '- [GO 掩码伪彩图](go-hit-mask.png)（金色=1，青色=2，紫色=3，灰色=4；不是游戏素材）', '']
    index_lines.extend(f'- [{name}]({name})' for name in pages)
    (evidence_dir / 'README.md').write_text('\n'.join(index_lines) + '\n', encoding='utf-8')
    manifest = dict(schemaVersion=1, stage='UI-00-audit-only', runtimeIntegrated=False,
                    sources=sources, resources=resources, toolbar=buttons, layout=LAYOUT,
                    go=dict(initialRect=[180, 120, width, height], movable=True, mask='go-hit-mask.bin',
                            maskValues=sorted(set(raw)), maskSemantics='partially-unresolved'),
                    anchorConvention='draw top-left = reference point - (anchorX,anchorY)',
                    references=REFERENCES, referenceCommit=REFERENCE_COMMIT)
    write_json(output / 'manifest.json', manifest)
    report = {**manifest, 'inventory': inventory, 'nativeEvidence': evidence, 'nonGraphs': non_graphs,
              'characters': character_audit, 'coverage': dict(
                  selectedGraphs=len(resources), exportedFrames=sum(r['graph']['frameCount'] for r in resources),
                  contactSheets=len(pages), allArchiveRecordsSemanticallyAudited=False,
                  nativeExecutableExecuted=False, originalGameScreenshotCaptured=False),
              'unknownsDocument': 'original-ui-resource-audit.md'}
    if verify_sources(game) != sources:
        raise ValueError('Source changed during export')
    write_json(audit_path, report)
    print(f"UI-00: {len(resources)} graphs, {report['coverage']['exportedFrames']} frames, {len(pages)} sheets")
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--game', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=REPO / 'frontend/public/richman/generated/ui')
    parser.add_argument('--evidence', type=Path, default=REPO / 'docs/richman/ui00')
    parser.add_argument('--audit', type=Path, default=REPO / 'docs/richman/original-ui-resource-audit.json')
    args = parser.parse_args()
    export(args.game, args.output, args.evidence, args.audit)
