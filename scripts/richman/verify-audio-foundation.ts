/** Local resource consistency only. Does not start a browser or play any audio. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {landingSound,validAudioManifest} from '../../frontend/src/features/richman/audio';
const root=process.cwd();
const read=(path:string)=>readFileSync(resolve(root,path));
const sha=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
const assert=(condition:unknown,message:string)=>{if(!condition)throw new Error(message);};
const inventory=JSON.parse(read('docs/richman/s3-04a-resources.json').toString());
const dir='frontend/public/richman/generated/audio/';
assert(validAudioManifest(JSON.parse(read(dir+'manifest.json').toString())),'audio manifest mismatch');
// Later presentation profiles may add cues at previously unassigned nodes.
for(const [node, expected] of Object.entries(inventory.landingNodes) as [string,{effect:number}][])assert(landingSound(Number(node))===String(expected.effect),`inherited landing node ${node}`);
const exported=[...inventory.music.filter((x:{export?:unknown})=>x.export).map((x:{export:unknown})=>x.export),...inventory.effects] as {file:string;sha256:string}[];
for(const x of exported){
 assert(sha(read(dir+x.file))===x.sha256,`changed ${x.file}`);
 execFileSync('ffmpeg',['-v','error','-i',resolve(root,dir+x.file),'-f','null','-'],{stdio:'pipe'});
}
const result={stage:'S3-04a',nativeExecution:false,browserStarted:false,resourceManifest:true,originalMapNodesChecked:Object.keys(inventory.landingNodes).length,exportedMediaDecoded:exported.length,method:'SHA256 + ffmpeg full decode + static map-to-cue consistency; no browser/audio-device test'};
writeFileSync('/private/tmp/s3-04a-resource-check.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
