import {describe, expect, it} from 'vitest';
import {objectPoses, validObjectArt} from './object-presentation';
import type {ObjectArt} from './object-presentation';
import {GameSession} from './game/session';
import type {Manifest} from './types';
import nodes from '../../../../shared/richman/japan-topology.fixture.json';
const manifest:Manifest={version:1,map:{name:'日本',width:2304,height:2304,nodes,scenery:[]},sprites:{},characters:['xiaomei','tuu','chyan','salonbus'].map(id=>({id,name:id,color:'#fff',idle:[],walk:[],walkFramesPerDirection:10}))};
const art:ObjectArt={version:1,profile:'object-presentation-v1',sourceHash:'c63023e815b1ad4bef172b6415d128c7f041f12b71b5d80dc3ff29240a0a1988',offsets:[[-10,-22],[-22,-10],[-22,10],[-10,22],[10,22],[22,10],[22,-10],[10,-22]],sprites:Object.fromEntries(Array.from({length:120},(_,i)=>[`god-${Math.floor(i/8)+1}-${i%8}`,{x:0,y:0,width:20,height:30,anchorX:10,anchorY:35}]))};
const map=new Map(nodes.map(n=>[n.id,n]));
function create(){return new GameSession(manifest,{id:()=> 'art-game',seed:()=> 'art-seed'},'surrender');}
describe('current-world object presentation (not browser acceptance)',()=>{
 it('validates all directional frames, bounds, source and signed/outside anchors',()=>{
  expect(validObjectArt(art,20,30)).toBe(true);
  expect(validObjectArt({...art,sourceHash:'other'},20,30)).toBe(false);
  expect(validObjectArt(art,19,30)).toBe(false);
  expect(validObjectArt({...art,sprites:{}},20,30)).toBe(false);
  expect(validObjectArt({...art,offsets:[[NaN,0]]},20,30)).toBe(false);
  expect(validObjectArt(null,20,30)).toBe(false);
 });
 it('projects road objects without changing state, RNG or replay',()=>{
  const m=create(),before=m.gameState,replay=m.exportReplay(),s=m.snapshot();
  const old=structuredClone(s),poses=objectPoses(s,map,art);
  expect(poses).toHaveLength(8);expect(poses.some(p=>p.key.startsWith('god-13-'))).toBe(true);
  expect(objectPoses(s,map,art)).toEqual(poses);expect(s).toEqual(old);
  expect(m.gameState).toEqual(before);expect(m.exportReplay()).toEqual(replay);
 });
 it.each([0,1,2,3,4,5,6,7])('follows carrier direction %i with opposing frame and native offset',d=>{
  const s=create().snapshot();s.g6!.gods=[{id:'attached',type:15,node:1,carrier:'player-1',remaining:13}];s.g6!.objects=[];
  const actor=s.actors[s.participants[0]];actor.direction=d;actor.x=100;actor.y=200;
  expect(objectPoses(s,map,art)).toEqual([{id:'attached',key:`god-15-${(d+4)%8}`,x:100+art.offsets[d][0],y:200+art.offsets[d][1]}]);
 });
 it('removes vanished/replaced gods immediately, with no old queue across G7/reset',()=>{
  const m=create(),s=m.snapshot();const first=objectPoses(s,map,art);
  s.g6!.gods=[];s.g6!.objects=[];expect(objectPoses(s,map,art)).toEqual([]);
  expect(objectPoses(m.snapshot(),map,art)).toEqual(first);m.reset();expect(objectPoses(m.snapshot(),map,art)).toEqual(first);
 });
 it('suppresses attached art for eliminated, travel, hospital, prison and hotel carriers',()=>{
  const s=create().snapshot();s.g6!.gods=[{id:'a',type:1,node:1,carrier:'player-1',remaining:3}];s.g6!.objects=[];
  const actor=s.participants[0];s.eliminated.push(actor);expect(objectPoses(s,map,art)).toEqual([]);s.eliminated=[];
  s.g2!.players['player-1'].prison=2;expect(objectPoses(s,map,art)).toEqual([]);s.g2!.players['player-1'].prison=0;
  s.g2!.players['player-1'].hospital=2;expect(objectPoses(s,map,art)).toEqual([]);s.g2!.players['player-1'].hospital=0;
  s.g2!.players['player-1'].travel=3;expect(objectPoses(s,map,art)).toEqual([]);s.g2!.players['player-1'].travel=0;
  s.g4!.hotel['player-1']=2;expect(objectPoses(s,map,art)).toEqual([]);
 });
 it('paused projection stays stable and unknown types or missing nodes do not invent frames',()=>{
  const s=create().snapshot();s.paused=true;expect(objectPoses(s,map,art)).toEqual(objectPoses(s,map,art));
  expect(objectPoses(s,new Map(),art)).toEqual([]);s.g6!.gods=[{id:'x',type:99,node:1,carrier:null,remaining:0}];s.g6!.objects=[];expect(objectPoses(s,map,art)).toEqual([]);
 });
});
