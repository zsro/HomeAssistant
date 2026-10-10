#!/usr/bin/env python3
"""Local licensed-install audio inventory/export. Never writes the source installation.
Only documented CD backgrounds 2..9 and landing slots 10/16 are exported.
"""
import argparse
import ctypes
import hashlib
import io
import json
from pathlib import Path
import platform
import re
import struct
import subprocess
import tempfile
import wave
from collections import Counter
from audit_map import parse_map

ROOT = Path(__file__).resolve().parents[2]
COMMIT = 'ec7d70e693059d1e781d9d1cc2ad7f36d360d39e'
SLOTS = [9, 0, 10, 10, 10, 10, 10, 10, 10, 10, 16, 16, 16, 16, 10, 10, 10]
RESOURCES = [7, 9, 10, 32, 33, 34, 35, 36, 37, 38, 43, 44, 45, 46, 53, 47, 48]
def digest(data):
    return hashlib.sha256(data).hexdigest()
def meta(path):
    data = path.read_bytes()
    return {'bytes': len(data), 'sha256': digest(data)}
class Archive:
    def __init__(self, path, decoder):
        self.data = path.read_bytes()
        self.end = struct.unpack_from('<I', self.data)[0]
        assert 4 <= self.end < len(self.data) and (len(self.data)-self.end)%4 == 0
        self.index = struct.unpack_from('<'+'I'*((len(self.data)-self.end)//4), self.data, self.end)
        self.decoder = decoder
    def read(self, index):
        pos = self.index[index]
        assert 4 <= pos and pos+16 <= self.end
        size, packed, _, _ = struct.unpack_from('<4I', self.data, pos)
        assert 0 <= size < 100_000_000 and pos+16+packed <= self.end, (index,pos,size,packed,self.end)
        data = self.data[pos+16:pos+16+packed]
        if size != packed:
            dest = ctypes.create_string_buffer(size)
            self.decoder(dest, data, size)
            data = dest.raw
        return data

def probe(path):
    result = subprocess.run(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_name,codec_type,sample_rate,channels,width,height','-of','json',str(path)],check=True,capture_output=True,text=True)
    return json.loads(result.stdout)
def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source',type=Path,default=Path('/Users/zsr/Documents/rich4'))
    p.add_argument('--reference',type=Path,default=Path('/private/tmp/richman-price-reference'))
    args=p.parse_args()
    game=args.source/'Game'; media=args.source/'Media'
    output=ROOT/'frontend/public/richman/generated/audio'; output.mkdir(parents=True,exist_ok=True)
    inventory={'stage':'S3-04a','referenceCommit':COMMIT,'nativeExecution':False,'sources':{},'archives':{},'music':[],'videos':[],'effects':[]}
    asm=(args.reference/'rich4.asm').read_text()
    def asm_bytes(label, length):
        block=asm.split(label+':',1)[1]
        return b''.join(int(value,16).to_bytes({'db':1,'dd':4}[kind],'little') for kind,value in re.findall(r'^(db|dd) (0x[0-9a-f]+)$',block,re.M))[:length]
    assert asm_bytes('ref_00475299',17)==bytes(SLOTS)
    assert asm_bytes('ref_0048234a',136)==b''.join(struct.pack('<II',x,0) for x in RESOURCES)
    exe=(game/'rich4.exe').read_bytes()
    assert digest(exe)=='110b29f9d2fadcff3836eb69ec380aa264951859c90955da6e11158d2f956a13'
    for key,pattern in [('landingSlots',bytes(SLOTS[2:])),('soundTable',b''.join(struct.pack('<II',x,0) for x in RESOURCES))]:
        assert exe.count(pattern)==1, (key,exe.count(pattern))
        inventory[key]={'values':SLOTS[2:] if key=='landingSlots' else RESOURCES, 'eventCodeStart':2 if key=='landingSlots' else None,'exeOffset':exe.index(pattern),'hex':pattern.hex()}
    inventory['sources']['rich4.exe']=meta(game/'rich4.exe')
    for name in ['rich4_media_music.asm','rich4_sound_effect.asm','rich4_load_map.asm','rich4_player_core_actions.asm','rich4.asm']:
        inventory['sources'][name]=meta(args.reference/name)
    with tempfile.TemporaryDirectory(prefix='rich4-audio-') as tmp:
        lib=Path(tmp)/'decoder.dylib'
        flags=['-dynamiclib'] if platform.system()=='Darwin' else ['-shared','-fPIC']
        subprocess.run(['cc',*flags,'-O2',str(ROOT/'scripts/richman/vendor/mkf_decompress.c'),'-o',str(lib)],check=True)
        decoder=ctypes.CDLL(str(lib)); decoder.mkf_decompress.argtypes=[ctypes.c_void_p,ctypes.c_void_p,ctypes.c_size_t]
        for path in sorted(game.glob('*')):
            if path.suffix.lower()!='.mkf': continue
            archive=Archive(path,decoder.mkf_decompress); formats=Counter(); frame_count=0
            for i in range(len(archive.index)):
                data=archive.read(i); sig=data[:4]
                formats[sig.hex()]+=1
                if sig in [b'SPR\0',b'SMP\0']: frame_count+=struct.unpack_from('<I',data,4)[0]
            inventory['archives'][path.name]={**meta(path),'entries':len(archive.index),'signatures':dict(formats),'spriteFrames':frame_count}
            if path.name.lower()=='effect.mkf':
                for index in [43,48]:
                    data=archive.read(index)
                    with wave.open(io.BytesIO(data),'rb') as wav:
                        detail={'channels':wav.getnchannels(),'sampleRate':wav.getframerate(),'sampleWidth':wav.getsampwidth(),'frames':wav.getnframes(),'duration':wav.getnframes()/wav.getframerate()}
                    name=f'effect-{index:02}.wav'; (output/name).write_bytes(data)
                    inventory['effects'].append({'index':index,'file':name,**meta(output/name),**detail})
            if path.name.lower()=='mapdat.mkf':
                nodes=parse_map(archive.read(2))['nodes']
                # Only the initial proven service families; other slot mappings deferred to b.
                inventory['landingNodes']={str(n['id']):{'eventCode':n['eventCodeCandidate'],'effect':RESOURCES[SLOTS[n['eventCodeCandidate']]]} for n in nodes if n['eventCodeCandidate'] in [2,3,10,11,12,14,15]}
    for path in sorted((media/'Music').glob('*.ogg')):
        entry={'file':path.name,**meta(path),**probe(path)}
        number=int(path.stem[5:])
        if 2 <= number <= 9:
            target=output/f'{path.stem}.mp3'
            subprocess.run(['ffmpeg','-v','error','-y','-i',str(path),'-map_metadata','-1','-codec:a','libmp3lame','-q:a','4',str(target)],check=True)
            entry['export']={'file':target.name,**meta(target),**probe(target)}
        inventory['music'].append(entry)
    for path in sorted(media.glob('*.avi')):
        inventory['videos'].append({'file':path.name,**meta(path),**probe(path)})
    inventory['unassignedWav']=[{'file':str(x.relative_to(args.source)),**meta(x),**probe(x)} for d in [game,media] for x in sorted(d.glob('*.wav'))]
    for path in [game/'Midi.txt',media/'Music/tracklen.nfo']:
        inventory['sources'][path.name]={**meta(path),'text':path.read_text(errors='replace')}
    manifest={'version':1,'music':[{'id':x['file'][:-4],'src':x['export']['file']} for x in inventory['music'] if 'export' in x],'effects':{str(x['index']):x['file'] for x in inventory['effects']}}
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (ROOT/'docs/richman/s3-04a-resources.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'music':len(inventory['music']),'exportedMusic':len(manifest['music']),'effects':inventory['effects'],'landingNodes':inventory['landingNodes'],'archives':{k:{'entries':v['entries'],'spriteFrames':v['spriteFrames']} for k,v in inventory['archives'].items()}},ensure_ascii=False))
if __name__=='__main__': main()
