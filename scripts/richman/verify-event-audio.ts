/** Static resource checks only; the exporter has already fully decoded each new WAV. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {landingSound,validAudioManifest} from '../../frontend/src/features/richman/audio';
import catalog from '../../frontend/src/features/richman/audio-catalog.json';
const read=(path:string)=>readFileSync(path);
const json=(path:string)=>JSON.parse(read(path).toString());
const sha=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
const a=json('docs/richman/s3-04a-resources.json'),b=json('docs/richman/s3-04b-resources.json');
const dir='frontend/public/richman/generated/audio/';
if(!validAudioManifest(json(dir+'manifest.json')))throw new Error('manifest invalid');
if(JSON.stringify(catalog)!==JSON.stringify(b.catalog))throw new Error('catalog differs from source audit');
for(let node=1;node<=110;node++)if(landingSound(node)!==(b.catalog.landings[node]?.toString()??null))throw new Error(`node ${node}`);
const old=[...a.music.filter((x:{export?:unknown})=>x.export).map((x:{export:unknown})=>x.export),...a.effects];
for(const x of [...old,...b.exports])if(sha(read(dir+x.file))!==x.sha256)throw new Error(`media changed ${x.file}`);
const result={stage:'S3-04b',browserStarted:false,nativeExecution:false,oldMediaHashes:old.length,newMediaHashes:b.exports.length,newMediaFullDecodesRecorded:b.decodedExports,mapNodesChecked:110,mappedNodes:Object.keys(b.catalog.landings).length,characterMappings:b.voiceRows.length};
writeFileSync('/private/tmp/s3-04b-resource-check.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
