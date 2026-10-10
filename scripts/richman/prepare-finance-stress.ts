import {planStressRent} from './plan-stress-rent';
import {planStressDividend} from './plan-stress-dividend';
import {planStressLoan} from './plan-stress-loan';
import {writeFileSync} from 'node:fs';
const routes=[['rent-2',()=>planStressRent('stress-rent-6',2,30000,2400)],['dividend-4',()=>planStressDividend('batch-9',4,'dividend',10000,3500)],['loan-3',()=>planStressLoan('stress-loan-0',3,100000,6500)]] as const;
for(const[kind,plan]of routes){if(process.env.RICHMAN_PLAN_KIND&&process.env.RICHMAN_PLAN_KIND!==kind)continue;const result=plan();if(!result)throw Error('Accepted route unavailable: '+kind);writeFileSync(`/private/tmp/richman-unified-05a-${kind}.json`,JSON.stringify(result));console.log(kind,result.replay.commands.length,result.state.turn);}
