import {strict as assert} from 'node:assert';import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';import type {ControlledReplay} from '../../frontend/src/features/richman/game/computer';import {decisionPlayer} from '../../frontend/src/features/richman/game/computer';import {decideComputer,AREA_GOODS} from '../../frontend/src/features/richman/game/computer-area';import {PROPERTY_CATALOG} from '../../frontend/src/features/richman/game/economy';import {shopPrice,shopSupply} from '../../frontend/src/features/richman/game/shop-acquisition';import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const goods=AREA_GOODS.map(g=>g.id as string),definitions=PROPERTY_CATALOG.properties;
export async function verifyComputerArea(replay:ControlledReplay){
 assert.equal(replay.rulesId,'japan-events-candidate-v44');assert.equal(replay.itemFingerprint,'f9dbb7e9');assert.equal(replay.control?.policy,'area-v1');const e=new GameEngine(nodes,replay.config),prefixes=new Map<string,number>(),acquisitions:unknown[]=[],uses:unknown[]=[],cancellations:unknown[]=[];let auto=0,human=0;const mark=(key:string,n:number)=>{if(!prefixes.has(key))prefixes.set(key,n);};
 for(let i=0;i<replay.commands.length;i++){
  if(i%150===0)await new Promise<void>(r=>setTimeout(r,0));const c=replay.commands[i],a=c.action,b=e.state,id=c.playerId,p=b.pending,ai=replay.control!.computerIds.includes(b.players.find(p=>p.id===id)!.characterId);
  if(a.type!=='pause'&&a.type!=='animationDone'&&!(a.type==='minigame'&&a.input.kind==='tick')){assert.equal(id,decisionPlayer(b));if(ai){auto++;assert.deepEqual(decideComputer(b,nodes,'area-v1')!.action,a);}else human++;}
  const r=e.dispatch(c);assert.ok(r.ok,JSON.stringify({i,c,r}));const s=e.state;
  for(const player of b.players)for(const item of goods)if(s.effects!.inventory[player.id][item]>b.effects!.inventory[player.id][item]){acquisitions.push({id:player.id,ai:replay.control!.computerIds.includes(player.characterId),item,turn:s.turn,action:a.type,events:r.events.filter(x=>['itemBought','mapCardReceived','fortuneResolved','g6Notice','magicResolved','inventoryTransferred'].includes(x.type))});mark(item+'-acquired',i+1);}
  if(a.type==='buyItem'&&goods.includes(a.itemId)){assert.ok(p?.kind==='shop'&&p.shelf?.cards.some(x=>x.itemId===a.itemId&&x.available));assert.equal(s.items!.points[id],b.items!.points[id]-shopPrice(a.itemId));assert.equal(shopSupply(s,a.itemId),shopSupply(b,a.itemId)-1);assert.equal(s.effects!.inventory[id][a.itemId],b.effects!.inventory[id][a.itemId]+1);assert.deepEqual(s.economy!.balances,b.economy!.balances);}
  const item=b.effects?.pending?.definitionId.slice(0,7);
  if(a.type==='pause'&&item&&goods.includes(item))mark(item+(s.paused?'-paused':'-resumed'),i+1);
  if(a.type==='item'&&item&&goods.includes(item)){
   if(a.action.type==='cancel'){assert.deepEqual(s.effects!.inventory,b.effects!.inventory);assert.deepEqual(s.g5,b.g5);assert.deepEqual(s.economy,b.economy);assert.equal(s.randomState,b.randomState);assert.equal(s.phase,'idle');cancellations.push({ai,id,item,turn:s.turn});mark('cancel-before',i);mark('cancel-after',i+1);}
   if(a.action.type==='confirm'){
    const targetId=a.action.target.id,def=definitions.find(d=>d.id===targetId)!,props=structuredClone(b.economy!.properties),inventory=structuredClone(b.effects!.inventory),slots=structuredClone(b.g3!.slots);
    inventory[id][item]--;const at=slots[id].indexOf(item);assert.ok(at>=0);slots[id].splice(at,1);assert.equal(s.g5!.supply[item],b.g5!.supply[item]+1);
    const affected=props.filter(q=>{const d=definitions.find(d=>d.id===q.id)!;return q.id===targetId||(item!=='card:11'&&def.kind==='land'&&d.kind==='land'&&d.name===def.name);});
    for(const q of affected){const d=definitions.find(d=>d.id===q.id)!;if(item==='card:09'){if(d.kind==='facility'&&!q.level){assert.ok([1,2,3,4].includes(a.value!));q.buildingType=a.value;}const cap=d.kind==='land'?(q.buildingType===1?1:5):[1,5,5,1,5][q.buildingType??0];q.level=Math.min(q.level+1,cap);}else{q.level=0;q.buildingType=0;q.research=null;}}
    assert.deepEqual(s.economy!.properties,props);assert.deepEqual(s.effects!.inventory,inventory);assert.deepEqual(s.g3!.slots,slots);assert.deepEqual(s.economy!.balances,b.economy!.balances);
    for(const key of ['g6','g2','players','calendar','finance','randomState','turn','active'] as const)assert.deepEqual(s[key],b[key]);assert.equal(s.news!.publicFund,b.news!.publicFund);assert.equal(s.phase,'idle');assert.equal(s.pending,null);assert.equal(s.effects!.pending,null);
    // Candidate AI forbids harming our/allied building or aiding enemy/unowned upgrades.
    if(ai)for(const q of affected){const old=b.economy!.properties.find(p=>p.id===q.id)!;if(q.level===old.level&&q.buildingType===old.buildingType)continue;const friendly=old.ownerId===id||!!b.g3!.allies[id]&&old.ownerId===b.g3!.allies[id]?.partner;assert.equal(friendly,item==='card:09');}
    uses.push({ai,id,item,target:targetId,value:a.value,turn:b.turn,phase:s.phase,affected:affected.map(q=>q.id),changes:props.filter((q,j)=>JSON.stringify(q)!==JSON.stringify(b.economy!.properties[j])).map(q=>({before:b.economy!.properties.find(p=>p.id===q.id),after:q}))});mark(item+'-confirm-before',i);mark(item+'-confirm-after',i+1);
   }
  }
 }
 assert.ok(auto&&human&&uses.length);const full=replayGame(nodes,JSON.parse(JSON.stringify(replay)));assert.deepEqual(full.state,e.state);assert.deepEqual(full.events,e.events);
 for(const n of new Set(prefixes.values())){await new Promise<void>(r=>setTimeout(r,0));const copy=replayGame(nodes,{...replay,commands:replay.commands.slice(0,n)});for(let j=n;j<replay.commands.length;j++){if(j%150===0)await new Promise<void>(r=>setTimeout(r,0));assert.ok(copy.dispatch(replay.commands[j]).ok);}assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);}
 return{players:replay.config.characterIds.length,commands:replay.commands.length,turn:e.state.turn,auto,human,acquisitions,uses,cancellations,prefixes:[...prefixes.keys()],state:e.state,events:e.events};
}
