import {readFileSync,writeFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';import {createHash} from 'node:crypto';
import {verifyComputerCircuit} from './verify-computer-circuit';
const routes=(process.env.RICHMAN_ROUTES??'terminal-2,terminal-3,terminal-4,attack,debt,liquidation,auction').split(',');
for(const route of routes){
 const path='/private/tmp/richman-computer-circuit-ui-'+route,replay=JSON.parse(readFileSync(path+'/replay.json','utf8')),rawReport=JSON.parse(readFileSync(path+'/results.json','utf8')),plan=JSON.parse(readFileSync('/private/tmp/computer-circuit-'+route+'.json','utf8'));
 assert.equal(rawReport.normalSpeed,true);assert.deepEqual(rawReport.errors,[]);assert.deepEqual(rawReport.cleanup,{raf:0,canvas:0});assert.deepEqual(replay.control,plan.replay.control);
 for(const k of ['seed','characterIds','initialFunds','startDate','rulesId'])assert.deepEqual(replay.config[k],plan.replay.config[k]);
 const normalize=(c:{playerId:string;action:Record<string,unknown>})=>{const a=structuredClone(c.action);delete a.decisionId;delete a.token;if(a.action){const effect=a.action as Record<string,unknown>;delete effect.decisionId;}return {playerId:c.playerId,action:a};};
 assert.deepEqual(replay.commands.filter((c:{action:{type:string}})=>c.action.type!=='pause').map(normalize),plan.replay.commands.map(normalize));
 const{state,events,...summary}=await verifyComputerCircuit(replay,route.startsWith('terminal'));
 if(route==='attack'){assert.ok(summary.reactions.some(r=>(r as {computer:boolean;kind:string;choice:string}).computer&&(r as {kind:string}).kind==='attack'&&(r as {choice:string}).choice==='decline'));assert.ok(rawReport.crossChecks.some((x:{kind:string;computer:boolean})=>x.kind==='reaction'&&x.computer));}
 if(route==='debt'){assert.ok(summary.cross.some(r=>(r as {kind:string;computer:boolean}).kind==='property'&&(r as {computer:boolean}).computer));assert.ok(rawReport.crossChecks.some((x:{kind:string;computer:boolean})=>x.kind==='property'&&x.computer));}
 if(route==='liquidation'){assert.ok(summary.forced.length&&summary.publicAuctions>0);assert.ok(summary.exits.some(r=>(r as {auctions:{amount:number}[]}).auctions.some(a=>a.amount>0)));assert.ok(rawReport.crossChecks.some((x:{kind:string;computer:boolean})=>x.kind==='auction'));}
 if(route==='auction')assert.ok(rawReport.crossChecks.some((x:{kind:string;computer:boolean})=>x.kind==='auction'&&x.computer));
 // The UI runner's `auto` includes normal human minigame timer commands. Canonical AI count is independently verified above.
 const{auto:scheduledNonMovementSteps,...report}=rawReport;const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
 const base='frontend/src/features/richman/game/fixtures/computer-circuit-v44-'+route;writeFileSync(base+'-replay.json',JSON.stringify(replay));writeFileSync(base+'-manifest.json',JSON.stringify({...summary,report:{...report,scheduledNonMovementSteps},hashes:{replay:hash(replay),state:hash(state),events:hash(events)}},null,2)+'\n');console.log(route,summary.commands,summary.turn,summary.auto,summary.cross.length,summary.forced.length,summary.publicAuctions);
}
