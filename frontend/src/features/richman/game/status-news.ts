import type { GameState } from './engine';
import type { Mobility } from './g2';

export const STATUS_NEWS_CATALOG = [
  {id:0,title:'全体在押玩家获释'}, {id:1,title:'全体在押玩家加刑三次'},
  {id:2,title:'全体住院玩家获准出院'}, {id:3,title:'全体住院玩家延长三次'},
  {id:16,title:'步行玩家停留一次'}, {id:17,title:'乘车玩家停留一次'},
] as const;
export type DetentionRoster = {prison:string[];hospital:string[]};
export type StatusNewsChanges = {targets:string[];players:{playerId:string;before:Mobility;after:Mobility}[];rosterBefore:DetentionRoster;rosterAfter:DetentionRoster};
export function usesVehicle(s:GameState,id:string){return s.g2!.players[id].vehicle!=='foot'||!!(s.g5?.engineers[id]&&!s.g5.engineers[id]!.suspended);}
export function statusNewsTargets(s:GameState,id:number){
 if(!s.news?.detention||!STATUS_NEWS_CATALOG.some(n=>n.id===id))return [];
 return s.players.filter(p=>!s.finance!.eliminated.includes(p.id)&&
  (id<4?s.news!.detention![id<2?'prison':'hospital'].includes(p.id):usesVehicle(s,p.id)===(id===17))).map(p=>p.id);
}
export function applyStatusNews(s:GameState,id:number,lines:string[]):StatusNewsChanges{
 const targets=statusNewsTargets(s,id),rosterBefore=structuredClone(s.news!.detention!);
 const players=targets.map(playerId=>{
  const m=s.g2!.players[playerId],before=structuredClone(m),label=`玩家${playerId.split('-')[1]}`;
  if(id<4){const key=id<2?'prison':'hospital',name=key==='prison'?'监禁':'住院';
   if(id%2===0){m[key]=128;s.news!.detention![key]=s.news!.detention![key].filter(p=>p!==playerId);lines.push(`${label}：${name} ${before[key]} → 获准解除；已移出设施名单，下次自身行动开始时解除状态，位置暂时不变。`);}
   else{m[key]=(m[key]+3)&127;lines.push(`${label}：${name}原始计时 ${before[key]} → ${m[key]}（增加3，按7位存储）；仍按自身行动计时。`);}
  }else{m.stop=1;lines.push(`${label}：停留 ${before.stop} → 1；下次自身行动不移动。当前车辆、骰数和其他状态不变；拘留等限制期间停留也会计时消耗。`);}
  return {playerId,before,after:structuredClone(m)};
 });
 return {targets,players,rosterBefore,rosterAfter:structuredClone(s.news!.detention!)};
}
