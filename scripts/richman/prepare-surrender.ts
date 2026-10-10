/** Command-only legal Japan routes. These files are plans, not UI acceptance. */
import {writeFileSync} from 'node:fs';
import {GameEngine,type Action} from '../../frontend/src/features/richman/game/engine';
import {computerDecision,decisionPlayer} from '../../frontend/src/features/richman/game/computer';
import {marketAvailable,tradeStock} from '../../frontend/src/features/richman/game/g6-market';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
for(const count of [2,3,4]){
 const e=new GameEngine(nodes,{gameId:'surrender-route',rulesId:'japan-events-candidate-v47',seed:'surrender-'+count,characterIds:['xiaomei','tuu','chyan','salonbus'].slice(0,count),humanIds:Array.from({length:count},(_,i)=>`player-${i+1}`),initialFunds:300000,startDate:'1998-01-25'}),marks:{index:number;kind:string}[]=[];
 let first=false,second=false,bought=false,done=false;
 for(let i=0;i<2000&&!done;i++){
  const s=e.state,p=s.pending,id=decisionPlayer(s);let a:Action|undefined;
  if(s.phase==='finished'){done=true;break;}
  if(count<4&&!first&&s.phase==='idle'){a={type:'surrender'};first=true;}
  if(count===4&&!first&&['idle','turnEnd'].includes(s.phase)&&id==='player-1'&&s.economy!.properties.filter(q=>q.ownerId===id).length>=4){a={type:'surrender'};first=true;}
  if(count===4&&!bought&&s.phase==='idle'&&marketAvailable(s)){const k=s.g6!.stocks.find(k=>tradeStock(structuredClone(s),k.id,'buy',1000,()=>{}));if(k){a={type:'stockTrade',stockId:k.id,side:'buy',quantity:1000};bought=true;}}
  if(p?.kind==='surrender')a={type:'chooseDeath',decisionId:p.id,targetId:count===3?null:first&&!second?'player-3':'player-4'};
  if(count===4&&first&&!second&&s.phase==='idle'&&id==='player-2'){a={type:'surrender'};second=true;}
  if(count===4&&second&&s.phase==='idle'&&id==='player-3'){done=true;break;}
  if(count===3&&first&&s.phase==='idle'&&id==='player-2'){done=true;break;}
  if(!a&&p?.kind==='bank')a={type:'leaveBank',decisionId:p.id};
  if(!a)a=computerDecision(s)?.action??((p?.kind==='roll'||p?.kind==='segment')?{type:'animationDone',token:p.id}:undefined);
  if(!a)throw Error('No decision '+s.phase);
  const r=e.dispatch({id:'route-'+i,gameId:s.gameId,expectedRevision:s.revision,playerId:id,action:a});if(!r.ok)throw Error(JSON.stringify({a,r}));
  for(const ev of r.events)if(['surrenderStarted','surrenderSelection','surrenderCompleted','disposalCompleted'].includes(ev.type))marks.push({index:i+1,kind:ev.type});
 }
 if(!done&&e.state.phase!=='finished')throw Error('Route limit');
 const result={replay:e.exportReplay(),state:e.state,events:e.events,marks,count};writeFileSync(`/private/tmp/surrender-${count}.json`,JSON.stringify(result));console.log(count,result.replay.commands.length,e.state.g6!.gods.filter(g=>g.type===15),e.state.finance!.disposal!.last?.auctions.length);
}
