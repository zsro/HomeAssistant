/** Exact legal routes used for S3-03f; route planning is not browser acceptance. */
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {planClosure} from './plan-god-closure';
for(const [kind,seed,commands] of [['car','god-closure-car-1',763],['research','god-closure-research-0',2424]] as const){const plan=planClosure(kind,seed);assert.ok(plan);assert.equal(plan.replay.commands.length,commands);writeFileSync('/private/tmp/god-closure-'+kind+'.json',JSON.stringify(plan));console.log(kind,commands,plan.marks);}
