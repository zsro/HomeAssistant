"""Record the local four-entry title menu evidence, reusing UI-00's audited pixels."""
import argparse
import struct
from pathlib import Path
from export_ui import verify_sources, pe_slice, sha, write_json
ROOT = Path(__file__).resolve().parents[2]
def export(game):
    sources = verify_sources(game)
    exe = (game / 'rich4.exe').read_bytes()
    offset, positions = pe_slice(exe, 0x46A9D8, 16)
    points = list(struct.iter_unpack('<hh', positions))
    spans = []
    for name, start, end, note in [
        ('title-load', 0x402980, 0x402992, 'Load local Data[1], nine frames.'),
        ('title-hover', 0x402701, 0x4027EC, 'Four entries; hover frame 2*i+2, anchor-relative hit rectangle and draw position.'),
        ('title-positions', 0x46A9D8, 0x46A9E8, 'Four int16 x/y pairs: START, LOAD, OPTION, EXIT.'),
        ('options-load', 0x4114B7, 0x4114C9, 'Options loads Data[3]; controls below are Web adaptations.'),
    ]:
        off, data = pe_slice(exe, start, end-start)
        spans.append(dict(id=name,start=hex(start),end=hex(end),fileOffset=off,hex=data.hex(),sha256=sha(data),note=note))
    write_json(ROOT/'docs/richman/ui07/native-evidence.json', dict(sources=sources,resources=[],nativeEvidence=spans,
        title=[dict(id=name,position=xy,normal=i*2+1,hover=i*2+2) for i,(name,xy) in enumerate(zip(['start','load','options','exit'],points))],
        boundary='Original executable not run. Title states/hit rectangles statically verified; touch targets enlarged, internal options/setup/endings adapted.'))
    assert sources == verify_sources(game)
if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--game',type=Path,required=True);export(p.parse_args().game)
