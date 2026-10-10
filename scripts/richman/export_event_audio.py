#!/usr/bin/env python3
"""S3-04b incremental evidence/export. Run export_audio.py first on a fresh install."""
import argparse,ctypes,io,json,re,struct,subprocess,tempfile,wave,platform
from pathlib import Path
from export_audio import Archive,ROOT,COMMIT,meta,digest
from audit_map import parse_map

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',type=Path,default=Path('/Users/zsr/Documents/rich4'));p.add_argument('--reference',type=Path,default=Path('/private/tmp/richman-price-reference'));args=p.parse_args()
 game=args.source/'Game';out=ROOT/'frontend/public/richman/generated/audio';manifest=json.loads((out/'manifest.json').read_text());asm=(args.reference/'rich4.asm').read_text();exe=(game/'rich4.exe').read_bytes()
 assert digest(exe)=='110b29f9d2fadcff3836eb69ec380aa264951859c90955da6e11158d2f956a13'
 def data(label):
  block=asm.split(label+':',1)[1].split('\n\n',1)[0]
  return b''.join(int(v,16).to_bytes({'db':1,'dd':4}[k],'little') for k,v in re.findall(r'^(db|dd) (0x[0-9a-f]+)$',block,re.M))
 refs=re.findall(r'^dd (ref_[0-9a-f]+)$',asm.split('_rich4_event_strings:',1)[1].split('\n\n',1)[0],re.M)
 assert len(refs)==12*27,len(refs)
 profiles=(args.reference/'rich4_characters.c').read_text()
 roles={'xiaomei':('孙小美',9),'tuu':('阿土伯',4),'chyan':('钱夫人',3),'salonbus':('沙隆巴斯',1)}
 voice={};rows=[]
 for cid,(name,index) in roles.items():
  block=next(x for x in profiles.split('},') if '/* '+name+' */' in x);assert int(re.search(r'\.character = (\d+)',block)[1])==index
  voice[cid]={}
  for slot in [0,1,2,15]:
   label=refs[index*27+slot];raw=data(label).split(b'\0')[0];assert re.match(rb'#[0-9]{4}',raw);resource=int(raw[1:5]);text=raw[5:].decode('big5');assert exe.count(raw+b'\0')==1,(cid,slot)
   rows.append({'characterId':cid,'nativeCharacter':index,'slot':slot,'label':label,'resource':resource,'text':text,'rawHex':raw.hex(),'exeOffset':exe.index(raw+b'\0')})
   voice[cid][str(slot)]=resource
 descriptor={}
 for resource,label in [(49,'ref_004823d2'),(50,'ref_004823da')]:
  raw=data(label);assert struct.unpack_from('<I',raw)[0]==resource and len(raw)==8;descriptor[str(resource)]={'label':label,'hex':raw.hex(),'matches':exe.count(raw)}
 pair=data('ref_004823d2')+data('ref_004823da');assert exe.count(pair)==1
 descriptor['pair49-50']={'hex':pair.hex(),'matches':1,'exeOffset':exe.index(pair)}
 with tempfile.TemporaryDirectory(prefix='rich4-event-audio-') as tmp:
  lib=Path(tmp)/'decoder.dylib';flags=['-dynamiclib'] if platform.system()=='Darwin' else ['-shared','-fPIC'];subprocess.run(['cc',*flags,'-O2',str(ROOT/'scripts/richman/vendor/mkf_decompress.c'),'-o',str(lib)],check=True)
  decoder=ctypes.CDLL(str(lib));decoder.mkf_decompress.argtypes=[ctypes.c_void_p,ctypes.c_void_p,ctypes.c_size_t]
  exports=[]
  for archiveName,indices,prefix in [('Effect.mkf',[49,50],'effect'),('Speaking.mkf',sorted({r['resource'] for r in rows}),'voice')]:
   archive=Archive(game/archiveName,decoder.mkf_decompress)
   for index in indices:
    raw=archive.read(index);name=f'{prefix}-{index:04d}.wav' if prefix=='voice' else f'{prefix}-{index:02d}.wav';(out/name).write_bytes(raw)
    with wave.open(io.BytesIO(raw),'rb') as wav:info={'channels':wav.getnchannels(),'sampleRate':wav.getframerate(),'sampleWidth':wav.getsampwidth(),'duration':wav.getnframes()/wav.getframerate()}
    subprocess.run(['ffmpeg','-v','error','-i',str(out/name),'-f','null','-'],check=True,capture_output=True)
    exports.append({'archive':archiveName,'index':index,'file':name,**meta(out/name),**info})
  nodes=parse_map(Archive(game/'MapDat.MKF',decoder.mkf_decompress).read(2))['nodes']
 landing={str(n['id']):48 if n['eventCodeCandidate'] in [10,11,12,13] else 43 for n in nodes if 2<=n['eventCodeCandidate']<=16}
 catalog={'profile':'event-audio-v1','characters':voice,'landings':landing,'voiceSlots':{'points50':[0,1],'points30':[2],'ordinaryUpgrade5':[15]}}
 (ROOT/'frontend/src/features/richman/audio-catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
 manifest['effects'].update({str(x['index']):x['file'] for x in exports if x['archive']=='Effect.mkf'});manifest['voices']={str(x['index']):x['file'] for x in exports if x['archive']=='Speaking.mkf'};manifest['eventProfile']='event-audio-v1';(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 files=['rich4.asm','rich4_player_core_actions.asm','rich4_player_say_on_events.asm','rich4_text_drawing.asm','rich4_sound_effect.asm','rich4_characters.c','rich4_player_info.h']
 result={'stage':'S3-04b','referenceCommit':COMMIT,'nativeExecution':False,'provenance':'retained local reference cache; hash registered, no fresh remote fetch','sources':{f:meta(args.reference/f) for f in files},'archives':{f:meta(game/f) for f in ['rich4.exe','Effect.mkf','Speaking.mkf','MapDat.MKF']},'voiceRows':rows,'descriptors':descriptor,'catalog':catalog,'exports':exports,'decodedExports':len(exports),'nativeBoundary':'local full prefixed strings match uniquely; relocated descriptor patterns are not proof of identical executable callsites'}
 (ROOT/'docs/richman/s3-04b-resources.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'voices':len(rows),'effects':[49,50],'landings':len(landing),'voiceRows':rows,'bytes':sum(x['bytes'] for x in exports)},ensure_ascii=False))
if __name__=='__main__':main()
