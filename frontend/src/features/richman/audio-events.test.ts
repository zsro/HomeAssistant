import {describe,expect,it} from 'vitest';
import {eventAudio} from './audio-events';
import {GameEngine} from './game/engine';
import type {GameEvent,GameState} from './game/engine';
import {PROPERTY_CATALOG} from './game/economy';
import nodes from './japan-topology.fixture.json';
const chars=['xiaomei','tuu','chyan','salonbus'];
const state=()=>new GameEngine(nodes,{gameId:'audio',seed:'audio',characterIds:chars,rulesId:'japan-events-candidate-v47'}).state;
const base={sequence:1,commandId:'cmd',playerId:'player-1',turn:1};
const landed=(node:number):GameEvent=>({...base,type:'landed',node});
const points=(node:number,amount:number,sequence=2):GameEvent=>({...base,type:'pointsAwarded',node,amount,balance:amount,sequence});
function upgrade(){const before=state();const id=PROPERTY_CATALOG.properties.find(x=>x.kind==='land')!.id;const p=before.economy!.properties.find(x=>x.id===id)!;p.ownerId='player-1';p.level=4;const after=structuredClone(before);after.economy!.properties.find(x=>x.id===id)!.level=5;const event:GameEvent={...base,type:'propertySettled',propertyId:id,operation:'upgrade',amount:100,level:5,recipientId:null,paid:{cash:100,bank:0}};return {before,after,event};}
describe('evidence-backed event routing; local constructed cases, not UI acceptance',()=>{
 it.each(chars)('routes %s by native character profile, not seat',cid=>{
  const s=state();s.players[0].characterId=cid;
  const expected={xiaomei:1295,tuu:1160,chyan:1133,salonbus:1079}[cid];
  expect(eventAudio(s,s,[landed(23),points(23,30)]).map(c=>c.id)).toEqual([String(expected)]);
 });
 it('50 points selects only two proven alternatives from public sequence; ten points stays silent',()=>{
  const s=state();expect(eventAudio(s,s,[landed(20),points(20,50,2)]).map(c=>c.id)).toEqual(['1293']);
  expect(eventAudio(s,s,[landed(20),points(20,50,3)]).map(c=>c.id)).toEqual(['1294']);
  expect(eventAudio(s,s,[landed(14),points(14,10)])).toEqual([]);
 });
 it('no speech for passing, unproven rewards or unknown characters',()=>{
  const s=state();expect(eventAudio(s,s,[points(23,30)])).toEqual([]);
  expect(eventAudio(s,s,[landed(23),points(23,100)])).toEqual([]);
  s.players[0].characterId='unknown';expect(eventAudio(s,s,[landed(23),points(23,30)])).toEqual([]);
 });
 it.each(['dream','winter','travel'] as const)('native %s gate suppresses voice',key=>{
  const s=state();s.g2!.players['player-1'][key]=1;expect(eventAudio(s,s,[landed(23),points(23,30)])).toEqual([]);
 });
 it('ordinary paid 4→5 emits build sound plus mapped celebration, no generic card building voice',()=>{
  const {before,after,event}=upgrade();expect(eventAudio(before,after,[event])).toEqual([{sequence:1,channel:'effect',id:'50',priority:2},{sequence:1,channel:'voice',id:'1308',priority:2}]);
  expect(eventAudio(before,after,[{...base,type:'propertyBuilt',propertyId:event.propertyId,fromLevel:4,level:5,ownerId:'player-1'}])).toEqual([]);
 });
 it('buy emits49; rent, unchanged level and facilities do not masquerade as ordinary construction',()=>{
  const {before,after,event}=upgrade();before.economy!.properties.find(x=>x.id===event.propertyId)!.ownerId=null;
  expect(eventAudio(before,after,[{...event,operation:'buy'}]).map(c=>c.id)).toEqual(['49']);
  expect(eventAudio(before,after,[{...event,operation:'rent'}])).toEqual([]);
  expect(eventAudio(after,after,[event])).toEqual([]);
  expect(eventAudio(before,after,[{...event,propertyId:PROPERTY_CATALOG.properties.find(x=>x.kind==='facility')!.id}])).toEqual([]);
 });
 it('routing never touches hidden RNG/news/fortune/G7 snapshot or mutates world',()=>{
  const s=state();const saved=structuredClone(s);
  const publicOnly=new Proxy(s,{get(target,key){if(['rng','news','fortune','g7'].includes(String(key)))throw new Error('hidden read');return Reflect.get(target,key);}}) as GameState;
  eventAudio(publicOnly,publicOnly,[landed(23),points(23,30)]);expect(s).toEqual(saved);
 });
});
