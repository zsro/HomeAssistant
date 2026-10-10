import fs from 'node:fs';
import {planReactionCircuit} from './plan-reaction-circuit';
for(const[kind,count,seed]of [['attack',2,'reaction-attack-9'],['waiver',3,'reaction-waiver-0'],['debt',4,'reaction-debt-4']]as const){
 if(process.env.RICHMAN_PLAN_KIND&&process.env.RICHMAN_PLAN_KIND!==kind)continue;
 const plan=planReactionCircuit(seed,kind,count);if(!plan)throw Error('No complete legal route: '+kind);
 fs.writeFileSync(`/private/tmp/richman-unified-05b-${kind}.json`,JSON.stringify(plan));console.log(kind,plan.replay.commands.length,plan.state.turn,plan.coverage);
}
