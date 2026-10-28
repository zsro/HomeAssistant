import fs from 'node:fs';
import {GameEngine} from '../../frontend/src/features/richman/game/engine';
import {ASSET_FORTUNE_RULES} from '../../frontend/src/features/richman/game/asset-fortune';
import nodes from '../../shared/richman/japan-topology.fixture.json';
import {planAssetFortune} from './plan-asset-fortune-journey';
const routes=[];
for(const target of (process.env.RICHMAN_TARGETS||'0,1,5,8,9').split(',').map(Number)){
 let best:ReturnType<typeof planAssetFortune>=null,bestSeed='';
 const players=target===5?4:target===1||target===9?3:2;
 for(let i=0;i<400;i++){
  const seed=`asset-group-${i}`,e=new GameEngine(nodes,{gameId:'search',seed,rulesId:ASSET_FORTUNE_RULES.id,characterIds:['a','b','c','d'].slice(0,players),initialFunds:300000});
  const enabled=e.state.fortune!.order.filter(n=>n>=17&&n<=32||n===target);
  if(enabled[0]!==target)continue;
  const p=planAssetFortune(seed,[target],players,best?Math.min(500,best.replay.commands.length):500);
  if(p&&(!best||p.replay.commands.length<best.replay.commands.length)){best=p;bestSeed=seed;console.log('candidate',target,seed,p.replay.commands.length,p.state.turn);}
  if(best&&best.replay.commands.length<(target===5?150:target<2?160:50))break;
 }
 if(!best)throw Error('No route '+target);
 const path=`/private/tmp/richman-unified-03h-${target}.json`;fs.writeFileSync(path,JSON.stringify(best,null,2));routes.push({target,seed:bestSeed,players,commands:best.replay.commands.length,turn:best.state.turn,path});
 fs.writeFileSync('/private/tmp/richman-03h-routes.json',JSON.stringify(routes,null,2));
}
console.log(JSON.stringify(routes));
