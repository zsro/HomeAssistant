#!/usr/bin/env python3
"""S3-04c: separate, reproducible object atlas; never rewrites base/audio assets."""
import argparse, ctypes, hashlib, json, platform, re, struct, subprocess, tempfile
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
from export_assets import Archive

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def export(game, output, reference, decoder):
    output.mkdir(parents=True, exist_ok=True)
    archive=Archive(game/'Data.mkf', decoder)
    source=(reference/'rich4.asm').read_text()
    block=source.split('ref_00474951:\n')[1].split('ref_00474991:')[0]
    raw=b''.join(int(v,16).to_bytes(1 if op=='db' else 4,'little') for op,v in re.findall(r'\b(db|dd) (0x[0-9a-f]+)',block))
    assert len(raw)==64
    exe=(game/'rich4.exe').read_bytes(); assert exe.count(raw)==1
    load_pattern=bytes.fromhex('8d8363010000508b15dc70480052e8696f040083c41089049db83849004383fb147cd9')
    assert exe.count(load_pattern)==1
    offsets=[list(struct.unpack_from('<ii',raw,i*8)) for i in range(8)]
    sprites={}; frames=[]; audit=[]; x=y=2; row=0; width=1024
    for t in range(1,16):
        rid=354+t; decoded=archive.frames(rid)
        assert len(decoded)==8, (rid,len(decoded))
        audit.append(dict(type=t,index=rid,frames=8,decodedSha256=hashlib.sha256(archive.read(rid)).hexdigest()))
        blob=archive.read(rid);cursor=struct.unpack_from('<I',blob,8)[0]+512
        for i,(im,ax,ay) in enumerate(decoded):
            indices=np.frombuffer(blob,'u1',im.width*im.height,cursor).reshape(im.height,im.width);cursor+=im.width*im.height
            pixels=np.array(im);pixels[:,:,3]=np.where(indices==0,0,255);im=Image.fromarray(pixels)
            if x+im.width+2>width: x=2;y+=row+4;row=0
            key=f'god-{t}-{i}'; sprites[key]=dict(x=x,y=y,width=im.width,height=im.height,anchorX=ax,anchorY=ay)
            frames.append((key,im)); x+=im.width+4;row=max(row,im.height)
    atlas=Image.new('RGBA',(width,y+row+2))
    for key,im in frames: atlas.paste(im,(sprites[key]['x'],sprites[key]['y']))
    atlas.save(output/'objects.webp',lossless=True)
    manifest=dict(version=1,profile='object-presentation-v1',sprites=sprites,offsets=offsets,sourceHash=sha(game/'Data.mkf'))
    (output/'manifest.json').write_text(json.dumps(manifest,separators=(',',':')))
    sheet=Image.new('RGB',(8*110,15*130),'#344356');draw=ImageDraw.Draw(sheet)
    for n,(key,im) in enumerate(frames):
        cell=(n%8*110,n//8*130); draw.text(cell,key,fill='white'); thumb=im.copy();thumb.thumbnail((105,110));sheet.paste(thumb,(cell[0],cell[1]+16),thumb)
    sheet.save(output/'contact.png')
    inventory={}
    for name in ['Data.mkf','Panel.mkf','jump.mkf']:
        a=Archive(game/name,decoder);inventory[name]=dict(bytes=(game/name).stat().st_size,sha256=sha(game/name),entries=len(a.index))
    result=dict(stage='S3-04c',archives=inventory,objects=audit,frameCount=len(frames),localLoadLoopOffset=exe.index(load_pattern),localLoadLoopHex=load_pattern.hex(),referenceIndexOffset=41,offsets=offsets,offsetTableExeOffset=exe.index(raw),atlas=dict(width=atlas.width,height=atlas.height,sha256=sha(output/'objects.webp')),manifestSha256=sha(output/'manifest.json'),nativeExecution=False)
    Path('docs/richman/s3-04c-resources.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--game',type=Path,required=True);p.add_argument('--reference',type=Path,required=True);p.add_argument('--output',type=Path,default=Path('frontend/public/richman/generated/animation'));a=p.parse_args()
    with tempfile.TemporaryDirectory() as temp:
        libpath=Path(temp)/'decoder.dylib';flags=['-dynamiclib'] if platform.system()=='Darwin' else ['-shared','-fPIC']
        subprocess.run(['cc',*flags,'-O2',str(Path(__file__).parent/'vendor/mkf_decompress.c'),'-o',str(libpath)],check=True)
        lib=ctypes.CDLL(str(libpath));lib.mkf_decompress.argtypes=[ctypes.c_void_p,ctypes.c_void_p,ctypes.c_size_t]
        export(a.game,a.output,a.reference,lib.mkf_decompress)
