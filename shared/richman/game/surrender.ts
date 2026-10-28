import type {GameState,EventPayload} from './engine';
import {SPECIAL_OBJECT_FINGERPRINT} from './special-objects-rules';
import {hashSeed} from './random';
import {attach} from './g6';
export const SURRENDER_RULES=Object.freeze({id:'japan-events-candidate-v47',base:'japan-events-candidate-v46',entry:'explicit-current-human-idle-or-turnEnd-no-pending;exit-first-shared-public-disposal;not-ordinary-bankruptcy',selection:'initial-humans>1;remaining-human>0;other-live-ordinary-seats>1;exited-source-responds;cancel-only-skips-god',slots:'15-two-stable-slots15,16-first-free-before-replacement;busy-no-overwrite;no-initial-five-round-death;attach13-own-incoming;remove-no-pair',inventory:'equipped-traffic-to-bag-before-clear-no-cap;no-points;ordinary1..8-pool-return;research-no-pool;saved-vehicle-already-bag-no-double-return;clear-engineer-and-dream-saved-equipment',restore:'g6-world-includes-dual-slots;explicit-Web-surrender-barrier-clears-old-G7-checkpoints;later-worlds-restore-normally-no-command-RNG-rewind',scope:'ordinary-human-safe-boundaries-only;native-exit-stack-special-actors-endgame-RNG-and-animations-deferred'});
export const SURRENDER_FINGERPRINT=hashSeed(JSON.stringify({base:SPECIAL_OBJECT_FINGERPRINT,rules:SURRENDER_RULES})).toString(16);
export type SurrenderDecision={kind:'surrender';id:string;sourceId:string;targets:string[]};
export type SurrenderEvent={type:'surrenderStarted';sourceId:string}|{type:'surrenderSelection';decision:SurrenderDecision}|{type:'surrenderCompleted';sourceId:string;targetId:string|null;outcome:'attached'|'cancelled'|'gated'|'busy';slot?:15|16};
type Emit=(e:EventPayload)=>void;
export function canSurrender(s:GameState){return s.rulesId===SURRENDER_RULES.id&&!s.paused&&['idle','turnEnd'].includes(s.phase)&&!s.pending&&!s.finance?.disposal?.current&&!s.finance?.payments?.current&&!s.finance?.batches?.current&&!s.g6?.surrender?.sourceId&&!!s.g6?.surrender?.humanIds.includes(s.players[s.active].id)&&!s.finance!.eliminated.includes(s.players[s.active].id);}
export function resumeSurrender(s:GameState,token:()=>string,emit:Emit){
 const d=s.g6?.surrender,sourceId=d?.sourceId;if(!d||!sourceId||s.finance!.disposal!.current||s.pending)return;
 const targets=s.players.filter(p=>p.id!==sourceId&&!s.finance!.eliminated.includes(p.id)).map(p=>p.id);
 if(s.phase==='finished'||d.humanIds.length<=1||!targets.some(id=>d.humanIds.includes(id))||targets.length<=1){d.sourceId=null;emit({type:'surrenderCompleted',sourceId,targetId:null,outcome:'gated'});if(s.phase==='finished'&&s.finance!.winnerId)emit({type:'gameEnded',winnerId:s.finance!.winnerId});return;}
 const decision:SurrenderDecision={kind:'surrender',id:token(),sourceId,targets};s.pending=decision;s.phase='surrender';emit({type:'surrenderSelection',decision:structuredClone(decision)});
}
/** Reserve before replacing the target's old god: two busy native slots cannot overwrite. */
export function attachSurrenderGod(s:GameState,targetId:string,emit:Emit):15|16|null {
 const slot=([15,16] as const).find(slot=>!s.g6!.gods.some(g=>g.type===15&&g.slot===slot));if(!slot)return null;
 const g={id:`god-${++s.g6!.serial}`,type:15,node:s.players.find(p=>p.id===targetId)!.node,carrier:null,remaining:0,slot};s.g6!.gods.push(g);
 const active=s.active;s.active=s.players.findIndex(p=>p.id===targetId);attach(s,g,emit);s.active=active;return slot;
}
export function chooseDeath(s:GameState,decisionId:string,targetId:string|null,emit:Emit){
 const d=s.pending;if(s.rulesId!==SURRENDER_RULES.id||s.phase!=='surrender'||d?.kind!=='surrender'||d.id!==decisionId||s.g6?.surrender?.sourceId!==d.sourceId)return false;
 if(targetId!==null&&(!d.targets.includes(targetId)||s.finance!.eliminated.includes(targetId)))return false;
 const slot=targetId===null?null:attachSurrenderGod(s,targetId,emit);
 s.g6.surrender.sourceId=null;s.pending=null;s.phase='turnEnd';
 emit({type:'surrenderCompleted',sourceId:d.sourceId,targetId,outcome:targetId===null?'cancelled':slot?'attached':'busy',...(slot?{slot}:{})});return true;
}
