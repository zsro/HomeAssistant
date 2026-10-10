import {planDreamCircuit} from './plan-dream-circuit';
import {writeFileSync} from 'node:fs';
const r=planDreamCircuit('dream-circuit-6',2,1600);if(!r)throw Error('No dream route');writeFileSync('/private/tmp/richman-unified-03ac-dream.json',JSON.stringify(r));console.log(r.state.turn,r.replay.commands.length);
