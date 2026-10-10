import {verifyCompleteNews} from './verify-complete-news';
/** Archive deterministic replay facts; does not substitute for browser execution. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { replayGame,GameEngine } from '../../frontend/src/features/richman/game/engine';
import { PROPERTY_CATALOG } from '../../frontend/src/features/richman/game/economy';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const input=process.env.RICHMAN_REPLAY!;
if(!input)throw Error('RICHMAN_REPLAY required');
const replay=JSON.parse(fs.readFileSync(input,'utf8'));
const checks:string[]=[];
const e=replayGame(nodes,replay),copy=replayGame(nodes,replay);
const hash=(value:unknown)=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
if(hash(e.state)!==hash(copy.state)||hash(e.events)!==hash(copy.events))throw Error('Replay mismatch');
const changes:{item:string;turn:number;player:string;command:string;inventoryBefore:number;inventoryAfter:number;worldChanged:boolean;events:unknown[]}[]=[];const timeline=new GameEngine(nodes,replay.config);
for(const c of replay.commands){const before=timeline.state,r=timeline.dispatch(c);if(!r.ok)throw Error('Invalid command');const after=timeline.state;
 for(const event of r.events){const check=verifyCompleteNews(before,after,event,r.events);if(check)checks.push(check);}
 if(c.action.type==='item'&&c.action.action.type==='confirm'&&before.effects?.pending?.definitionId==='tool:10:time-v1'){
  const saved=before.g7!.checkpoints[c.playerId]!.world;
  for(const key of ['players','economy','finance','roadTools','g2','g3','g4','g6'] as const)assert.deepEqual(after[key],saved[key]);
  const inventory=structuredClone(saved.effects!.inventory);inventory[c.playerId]['tool:10']--;assert.deepEqual(after.effects!.inventory,inventory);
  assert.equal(after.randomState,before.randomState);assert.equal(after.turn,before.turn);assert.equal(after.phase,'idle');assert.ok(Object.values(after.g7!.checkpoints).every(x=>x===null));checks.push('time: actual browser replay restores multi-player world and historic inventory minus one, keeps RNG/turn, invalidates history');
 }
 for(const event of r.events)if(event.type==='auctionSettled'&&event.winnerId){assert.equal(after.economy!.properties.find(p=>p.id===event.propertyId)!.ownerId,event.winnerId);if(event.sourceId==='public')assert.equal(after.news!.publicFund-before.news!.publicFund,event.amount);else assert.equal(after.economy!.balances[event.sourceId].bank-before.economy!.balances[event.sourceId].bank,event.amount);assert.equal(before.economy!.balances[event.winnerId].cash-after.economy!.balances[event.winnerId].cash,event.amount);checks.push(event.sourceId==='public'?'public auction: winner cash paid to public fund, no player bank receipt':'auction: actual winner cash and source bank transfer');}

 for(const event of r.events)if(event.type==='newsResolved'&&event.statusChanges){
  const change=event.statusChanges,id=event.newsId,key=id<2?'prison':'hospital';
  const eligible=before.players.filter(p=>!before.finance!.eliminated.includes(p.id)&&(id<4?before.news!.detention![key].includes(p.id):(before.g2!.players[p.id].vehicle!=='foot'||!!(before.g5!.engineers[p.id]&&!before.g5!.engineers[p.id]!.suspended))===(id===17))).map(p=>p.id);
  assert.deepEqual(change.targets,eligible);assert.deepEqual(change.rosterBefore,before.news!.detention);
  const roster=structuredClone(before.news!.detention!);if(id<4&&id%2===0)roster[key]=roster[key].filter(p=>!eligible.includes(p));
  assert.deepEqual(after.news!.detention,roster);assert.deepEqual(change.rosterAfter,roster);
  for(const p of before.players){const m=structuredClone(before.g2!.players[p.id]);if(eligible.includes(p.id)){if(id<4)m[key]=id%2===0?128:(m[key]+3)&127;else m.stop=1;const entry=change.players.find(x=>x.playerId===p.id)!;assert.deepEqual(entry.before,before.g2!.players[p.id]);assert.deepEqual(entry.after,m);}assert.deepEqual(after.g2!.players[p.id],m);}
  assert.deepEqual(after.economy,before.economy);assert.deepEqual(after.effects!.inventory,before.effects!.inventory);assert.equal(after.randomState,before.randomState);
  checks.push(`news${id}: independent current-traffic/registered-facility target set, exact timer writes, roster and unchanged assets/inventory/RNG`);
 }
 for(const event of r.events)if(event.type==='newsResolved'&&event.operatingChanges){
  const change=event.operatingChanges;
  if(event.newsId===6){
   assert.equal(change.candidates!.length,PROPERTY_CATALOG.properties.length);assert.ok(change.prices!.length>0);
   const first=PROPERTY_CATALOG.properties.find(d=>d.id===change.prices![0].id)!;
   const expected=PROPERTY_CATALOG.properties.filter(d=>first.kind==='land'?d.kind==='land'&&d.name===first.name:d.id===first.id).map(d=>d.id);
   assert.deepEqual(change.prices!.map(p=>p.id),expected);
   for(const price of change.prices!){const d=PROPERTY_CATALOG.properties.find(d=>d.id===price.id)!,old=before.economy!.properties.find(p=>p.id===d.id)!,now=after.economy!.properties.find(p=>p.id===d.id)!;assert.equal(price.before,old.basePrice??d.basePrice);assert.equal(price.after,Math.floor(price.before*13/10)&65535);assert.equal(now.basePrice,price.after);assert.deepEqual({...now,basePrice:old.basePrice},old);}
   for(const p of before.economy!.properties)if(!expected.includes(p.id))assert.deepEqual(after.economy!.properties.find(q=>q.id===p.id),p);
   assert.deepEqual(after.economy!.balances,before.economy!.balances);checks.push('news6: actual same-name or single-facility base-price writes, rounding, unaffected properties and balances');
  }
  if(event.newsId===12){let receipt=0;for(const t of change.taxes!){const base=before.economy!.properties.filter(p=>p.ownerId===t.playerId).reduce((v,p)=>{const d=PROPERTY_CATALOG.properties.find(d=>d.id===p.id)!;return v+(p.basePrice??d.basePrice)+p.level*d.upgradeCost;},0);assert.equal(t.base,base);assert.equal(t.due,Math.floor(base/20));const b=before.economy!.balances[t.playerId],n=after.economy!.balances[t.playerId];assert.equal(t.cash,Math.min(b.cash,t.due));assert.equal(t.bank,Math.min(b.bank,t.due-t.cash));assert.equal(n.cash,b.cash-t.cash);assert.equal(n.bank,b.bank-t.bank);assert.equal(t.unpaid,t.due-t.cash-t.bank);receipt+=t.cash+t.bank;}assert.equal(after.news!.publicFund-before.news!.publicFund,receipt);checks.push('news12: actual property tax bases, per-owner rounding, cash-first/bank-second amounts and public receipt');}
 }
 for(const event of r.events)if(event.type==='newsResolved'&&event.propertyChanges){
  const change=event.propertyChanges;
  if(event.newsId===5||event.newsId===15){
   assert.equal(change.properties.length,1);const p=change.properties[0];
   const candidates=PROPERTY_CATALOG.properties.filter(d=>(event.newsId!==15||d.kind==='land')&&before.economy!.properties.some(p=>p.id===d.id&&p.level>0)).sort((a,b)=>Number(a.kind==='facility')-Number(b.kind==='facility')||Number(a.id.split(':').at(-1))-Number(b.id.split(':').at(-1))).map(d=>d.id);
   assert.deepEqual(change.candidates,candidates);assert.ok(candidates.includes(p.before.id));
   assert.deepEqual(p.before,before.economy!.properties.find(q=>q.id===p.before.id));
   assert.deepEqual(p.after,after.economy!.properties.find(q=>q.id===p.before.id));
   assert.equal(p.after.level,event.newsId===5||p.before.buildingType?0:p.before.level-1);
   assert.equal(p.after.ownerId,event.newsId===5?null:p.before.ownerId);
   assert.equal(p.after.priceStatus,p.before.priceStatus);
   assert.deepEqual(after.economy!.balances,before.economy!.balances);
   for(const q of before.economy!.properties)if(q.id!==p.before.id)assert.deepEqual(after.economy!.properties.find(p=>p.id===q.id),q);
   checks.push(`news${event.newsId}: actual target belongs to full eligible set; single property ownership/level change; other properties and money unchanged`);
  }else{
   const counts=before.players.filter(p=>!before.finance!.eliminated.includes(p.id)).map(p=>({playerId:p.id,count:before.economy!.properties.filter(q=>q.ownerId===p.id).length}));
   assert.deepEqual(change.counts,counts);const extreme=(event.newsId===8?Math.max:Math.min)(...counts.map(p=>p.count)),winner=counts.find(p=>p.count===extreme)!.playerId;
   for(const p of before.players){assert.equal(after.economy!.balances[p.id].cash-before.economy!.balances[p.id].cash,p.id===winner?(event.newsId===8?10000:5000):0);assert.equal(after.economy!.balances[p.id].bank,before.economy!.balances[p.id].bank);}
   assert.deepEqual(after.economy!.properties,before.economy!.properties);
   checks.push(`news${event.newsId}: actual land counts, first-seat extreme and cash-only award independently verified`);
  }
 }
 if(c.action.type==='item'&&c.action.action.type==='confirm'&&before.effects?.pending){const item=before.effects.pending.definitionId.slice(0,7);changes.push({item,turn:before.turn,player:c.playerId,command:c.id,inventoryBefore:before.effects.inventory[c.playerId][item],inventoryAfter:after.effects!.inventory[c.playerId][item],worldChanged:hash({players:before.players,economy:before.economy,g2:before.g2,g3:before.g3,g4:before.g4,g5:before.g5,g6:before.g6})!==hash({players:after.players,economy:after.economy,g2:after.g2,g3:after.g3,g4:after.g4,g5:after.g5,g6:after.g6}),events:r.events});}
}
const acquisitions=e.events.filter(e=>e.type==='itemBought'||e.type==='g5Notice'&&e.message.startsWith('研究完成')||e.type==='g6Notice'&&e.message.includes('获得card:'));
const result={checks,acquisitions,input,rulesId:replay.rulesId,fingerprint:replay.itemFingerprint,commands:replay.commands.length,players:replay.config.characterIds.length,turn:e.state.turn,state:hash(e.state),events:hash(e.events),changes};
fs.writeFileSync(process.env.RICHMAN_VERIFY_OUTPUT||'/private/tmp/richman-replay-verified.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,changes:changes.map(c=>({item:c.item,turn:c.turn,worldChanged:c.worldChanged}))}));
