import type {GameState,EventPayload} from './engine';
import {SHOP_ACQUISITION_FINGERPRINT} from './shop-acquisition';
import {g6Draw} from './g6-random';
import {hashSeed} from './random';
import grid from './penguin-grid.json';
export const MINIGAME_RULES=Object.freeze({id:'japan-events-candidate-v41',base:'japan-events-candidate-v40',entry:'Japan22/24/26-stop-current-human-no-dream-no-fee;no-AI-random50..69-shortcut',clock:'explicit-start;penguin/balloon100ms150ticks;sky50ms360ticks;pause-freezes;drain-balloon/sky;deterministic-ticks-and-input;ack-before-turnEnd',penguin:'64cells;hidden-counts3/12/3/9/1;trap-ends;values0/5/12/8/20;start2,6;DDA-four-ticks-per-step;dig-four-ticks',balloon:'16slots;8lanes;spawn30/1000;types0..4:4each,5..8:2each,special9/10/11:2/5/3;click-all-hitboxes;normalcap999;double/half;question-end/freeze20/fast/slow/zero/double;drain-after-time',sky:'16slots;moving-source110..530-step12;weighted10/5/3/1points;projectile100,-16,+2;mouse-follow10;one-bomb-ends-keeps-score;18seconds-plus-drain',settlement:'score-low16-added-to-current-points-mod65536;no-cash-inventory-pool-company-calendar-change;once-on-result-ack',differences:'seeded-range-not-native-rand;procedural-SVG-not-original-art;sky-fixed-body-hitbox-x24-y320..380-not-character-frame;penguin-safe-hole-step;explicit-start/ack-and-quit-keeps-earned-score-Web-only;no-voice/delay/native-exit'});
export const MINIGAME_FINGERPRINT=hashSeed(JSON.stringify({base:SHOP_ACQUISITION_FINGERPRINT,rules:MINIGAME_RULES,grid})).toString(16);
export const MINIGAME_NAMES={penguin:'企鹅寻宝',balloon:'射气球',sky:'喜从天降'};
export type MiniKind=keyof typeof MINIGAME_NAMES;
export type MiniInput={kind:'start'|'tick'|'quit'|'ack'}|{kind:'point';x:number;y:number}|{kind:'dig';cell:number};
export type Balloon={x:number;y:number;type:number;burst:number};
export type Drop={x:number;y:number;type:number;vy:number;drift:number};
export type Penguin={cells:number[];dug:number[];x:number;y:number;target:number|null;dx:number;dy:number;step:number;dig:number};
export type Sky={x:number;target:number;moving:boolean;drops:(Drop|null)[];source:number;mode:number;frame:number;dropFrame:number;bombFrame:number;bombX:number};
export type MiniDecision={kind:'minigame';id:string;node:number;game:MiniKind;stage:'ready'|'playing'|'result';tick:number;remaining:number;score:number;reason:'time'|'trap'|'bomb'|'quit'|null;penguin?:Penguin;balloons?:(Balloon|null)[];freeze:number;speed:number;sky?:Sky};
export type MiniEvent={type:'minigameOffered';game:MiniKind;node:number}|{type:'minigameFinished';game:MiniKind;node:number;score:number;amount:number;before:number;balance:number;reason:MiniDecision['reason'];ticks:number};
function draw(s:GameState,n:number){const r=g6Draw(s.randomState,n);s.randomState=r.state;return r.index;}
export function offerMinigame(s:GameState,token:()=>string,emit:(e:EventPayload)=>void){
 const p=s.players[s.active],game=({22:'penguin',24:'balloon',26:'sky'}as const)[p.node as 22|24|26];
 if((s.rulesId!==MINIGAME_RULES.id&&(s.rulesId!=='japan-events-candidate-v42' && (s.rulesId!=='japan-events-candidate-v43' && (s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47'))))))||!game||s.g2?.players[p.id].dream)return false;
 s.phase='minigame';s.pending={kind:'minigame',id:token(),node:p.node,game,stage:'ready',tick:0,remaining:game==='sky'?360:150,score:0,reason:null,freeze:0,speed:0};emit({type:'minigameOffered',game,node:p.node});return true;
}
function result(d:MiniDecision,reason:NonNullable<MiniDecision['reason']>){d.stage='result';d.reason=reason;}
function start(s:GameState,d:MiniDecision){
 d.stage='playing';
 if(d.game==='penguin'){
  const cells:number[]=grid.map(g=>g.x?0:-1),pool=cells.flatMap((n,i)=>n===0?[i]:[]);
  [3,12,3,9,1].forEach((count,k)=>{for(let j=0;j<count;j++)cells[pool.splice(draw(s,pool.length),1)[0]]=k+1;});
  d.penguin={cells,dug:[],x:2.5,y:6.5,target:null,dx:0,dy:0,step:0,dig:0};
 }else if(d.game==='balloon')d.balloons=Array(16).fill(null);
 else d.sky={x:320,target:320,moving:false,drops:Array(16).fill(null),source:110,mode:3,frame:4,dropFrame:0,bombFrame:-1,bombX:0};
}
const validCell=(x:number,y:number)=>x>=0&&x<9&&y>=0&&y<9&&grid[y*9+x].x!==0;
function penguinTick(d:MiniDecision){
 const p=d.penguin!;
 if(p.target===null)return;
 if(p.dig){if(--p.dig===0){const t=p.cells[p.target];p.cells[p.target]=0;if(!p.dug.includes(p.target))p.dug.push(p.target);p.target=null;if(t===1)result(d,'trap');else d.score+=[0,0,5,12,8,20][t];}return;}
 if(++p.step<4)return;p.step=0;
 let x=p.x+p.dx,y=p.y+p.dy;
 if(!validCell(Math.floor(x),Math.floor(y))){
  // Native DDA detours at the central hole. Keep movement on valid adjacent tiles.
  const tx=p.target%9,ty=Math.floor(p.target/9),cx=Math.floor(p.x),cy=Math.floor(p.y);
  const candidates=[[cx+1,cy],[cx,cy+1],[cx-1,cy],[cx,cy-1]].filter(([a,b])=>validCell(a,b));
  candidates.sort((a,b)=>(a[0]-tx)**2+(a[1]-ty)**2-((b[0]-tx)**2+(b[1]-ty)**2));
  x=candidates[0][0]+.5;y=candidates[0][1]+.5;
  const length=Math.max(Math.abs(tx-Math.floor(x)),Math.abs(ty-Math.floor(y)));
  if(length){p.dx=(tx-Math.floor(x))/length;p.dy=(ty-Math.floor(y))/length;}
 }
 p.x=x;p.y=y;if(Math.floor(x)===p.target%9&&Math.floor(y)===Math.floor(p.target/9))p.dig=4;
}
const balloonSpeeds=[15,15,15,15,18,18,18,24,24,24,24,18];
function balloonTick(s:GameState,d:MiniDecision){
 if(d.freeze)d.freeze--;
 const slots=d.balloons!;
 for(let i=0;i<16;i++){
  const b=slots[i];
  if(b){if(b.burst){if(--b.burst===0)slots[i]=null;}else{if(!d.freeze)b.y-=d.speed===-1?balloonSpeeds[b.type]*2:d.speed===1?Math.floor(balloonSpeeds[b.type]/2):balloonSpeeds[b.type];if(b.y<-(b.type<6?30:26))slots[i]=null;}continue;}
  if(d.remaining===0)continue;
  const r=draw(s,1000);if(r>=30)continue;
  const type=r<20?Math.floor(r/4):r<28?Math.floor((27-r)/2)+5:[9,9,10,10,10,10,10,11,11,11][draw(s,10)];
  const lanes=Array.from({length:8},(_,j)=>40+80*j).filter(x=>!slots.some(b=>b&&b.x===x&&b.y>300));
  if(lanes.length)slots[i]={x:lanes[draw(s,lanes.length)],y:420,type,burst:0};
 }
 if(d.remaining===0&&slots.every(b=>!b))result(d,'time');
}
function balloonHit(s:GameState,d:MiniDecision,x:number,y:number){
 for(const b of d.balloons!){if(!b||b.burst||Math.abs(x-b.x)>(b.type<6?22:18)||Math.abs(y-b.y)>(b.type<6?30:26))continue;
  if(b.type===9)d.score=(d.score*2)|0;
  else if(b.type===10)d.score>>=1;
  else if(b.type===11){d.freeze=0;d.speed=0;switch(draw(s,6)){case 0:d.remaining=1;break;case 1:d.freeze=20;break;case 2:d.speed=-1;break;case 3:d.speed=1;break;case 4:d.score=0;break;case 5:d.score=(d.score*2)|0;break;}}
  else d.score=Math.min(999,d.score+b.type+1);
  b.burst=3;
 }
}
function spawnDrop(s:GameState,g:Sky,x:number,bomb=false){const slot=g.drops.indexOf(null);if(slot<0)return;const r=bomb?0:draw(s,20),type=bomb?4:r<9?3:r<15?2:r<18?1:0;g.drops[slot]={x,y:100,type,vy:-16,drift:Math.trunc((x-320)/210*260-(x-320))};}
export const dropX=(b:Drop)=>b.x+Math.trunc(b.drift*Math.max(0,b.y-130)/250);
function skyTick(s:GameState,d:MiniDecision){
 const g=d.sky!;
 for(let i=0;i<16;i++){const b=g.drops[i];if(!b)continue;
  if(g.moving&&Math.abs(dropX(b)-g.x)<24&&b.y>320&&b.y<380){g.drops[i]=null;if(b.type===4){result(d,'bomb');return;}d.score+=[10,5,3,1][b.type];continue;}
  if(b.y<130){b.vy=Math.min(16,b.vy+2);b.y+=b.vy;}else b.y+=[24,18,15,12,15][b.type];if(b.y>380)g.drops[i]=null;
 }
 if(Math.abs(g.x-g.target)>8){g.x+=g.x<g.target?10:-10;g.moving=true;}
 if(g.bombFrame<0){if(((g.mode<2&&g.source>320)||(g.mode>3&&g.source<320))&&draw(s,10)>=7&&d.remaining>0){g.bombFrame=0;g.bombX=draw(s,140)+(g.source>320?160:360);}}
 else{g.bombFrame++;if(g.bombFrame===8)spawnDrop(s,g,g.bombX,true);if(g.bombFrame===12)g.bombFrame=-1;}
 if(d.remaining===0){g.mode=2;g.frame=2;if(g.drops.every(b=>!b)&&g.bombFrame<0)result(d,'time');return;}
 if(g.mode===0||g.mode===4){const dir=g.mode===0?1:-1;
  if(g.frame<5){if(g.frame===g.dropFrame)spawnDrop(s,g,g.source);g.frame++;g.source+=12*dir;}
  else{if(((dir===1?g.source>320:g.source<320)&&draw(s,4)===0)||g.source===(dir===1?530:110))g.mode=dir===1?2:3;else{g.dropFrame=draw(s,5);g.source+=12*dir;}g.frame=0;}
 }else if(g.mode===2||g.mode===3){if(++g.frame===5){g.mode=g.mode===2?4:0;g.frame=0;}}
}
export function actMinigame(s:GameState,decisionId:string,input:MiniInput,emit:(e:EventPayload)=>void){
 const d=s.pending;if((s.rulesId!==MINIGAME_RULES.id&&(s.rulesId!=='japan-events-candidate-v42' && (s.rulesId!=='japan-events-candidate-v43' && (s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47'))))))||s.phase!=='minigame'||d?.kind!=='minigame'||d.id!==decisionId)return false;
 if(input.kind==='ack'){
  if(d.stage!=='result')return false;const who=s.players[s.active].id,before=s.items!.points[who],amount=d.score&65535,balance=(before+amount)&65535;s.items!.points[who]=balance;
  emit({type:'minigameFinished',game:d.game,node:d.node,score:d.score,amount,before,balance,reason:d.reason,ticks:d.tick});s.pending=null;s.phase='turnEnd';return true;
 }
 if(input.kind==='start'){if(d.stage!=='ready')return false;start(s,d);return true;}
 if(input.kind==='quit'){if(d.stage==='result')return false;result(d,'quit');return true;}
 if(d.stage!=='playing')return false;
 if(input.kind==='point'){
  if(!Number.isInteger(input.x)||!Number.isInteger(input.y)||input.x<0||input.x>639||input.y<0||input.y>420)return false;
  if(d.game==='balloon')balloonHit(s,d,input.x,input.y);else if(d.game==='sky')d.sky!.target=input.x;else return false;return true;
 }
 if(input.kind==='dig'){
  const p=d.penguin;if(!p||p.target!==null||!Number.isInteger(input.cell)||input.cell<0||input.cell>=81||p.cells[input.cell]<0)return false;
  const x=input.cell%9,y=Math.floor(input.cell/9),cx=Math.floor(p.x),cy=Math.floor(p.y);if(x===cx&&y===cy)return false;
  p.x=cx+.5;p.y=cy+.5;p.target=input.cell;const len=Math.max(Math.abs(x-cx),Math.abs(y-cy));p.dx=(x-cx)/len;p.dy=(y-cy)/len;p.step=0;return true;
 }
 if(input.kind!=='tick')return false;
 d.tick++;if(d.remaining)d.remaining--;
 if(d.game==='penguin'){if(!d.remaining)result(d,'time');else penguinTick(d);}
 else if(d.game==='balloon')balloonTick(s,d);else skyTick(s,d);
 return true;
}
export {grid as PENGUIN_GRID};
