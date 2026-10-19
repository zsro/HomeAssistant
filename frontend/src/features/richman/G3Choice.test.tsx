import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ItemPanel } from './ItemPanel';
import { ReactionPanel } from './G3Choice';
import { GameSession } from './game/session';
import { G3_GOODS } from './game/g3';
import type { Manifest } from './types';
import nodes from './japan-topology.fixture.json';
afterEach(cleanup);
const manifest:Manifest={version:1,map:{name:'日本',width:2304,height:2304,nodes,scenery:[]},sprites:{},characters:['小美','土伯','夫人','沙隆'].map((name,i)=>({id:String(i),name,color:'#fff',idle:[],walk:[],walkFramesPerDirection:10}))};
function fixture(){const session=new GameSession(manifest);session.start({mode:'g3',characterIds:['0','2','3'],seed:'ui-g3'});return {snapshot:session.snapshot(),onUse:vi.fn(()=>true),buy:vi.fn(()=>true),leave:vi.fn()};}
it('selects one inventory item after robbery target, preserves pause/cancel and resets item on target change',()=>{
 const props=fixture(),s=props.snapshot;s.phase='effect';s.effects!.pending={id:'rob',definitionId:G3_GOODS[0].effect,playerId:'player-1',timing:'beforeRoll'};s.g3Choices!['card:13']=[{id:'player-2',items:['card:21']},{id:'player-3',items:['tool:08']}];s.effects!.inventory['player-2']['card:21']=1;
 const view=render(<ItemPanel {...props}/>);const confirm=screen.getByRole('button',{name:'确认使用抢夺卡'});expect(confirm).toBeDisabled();fireEvent.change(screen.getByLabelText('目标玩家'),{target:{value:'player-2'}});expect(confirm).toBeDisabled();fireEvent.change(screen.getByLabelText('抢夺物品'),{target:{value:'card:21'}});expect(confirm).toBeEnabled();s.paused=true;view.rerender(<ItemPanel {...props}/>);expect(confirm).toBeDisabled();expect(screen.getByLabelText('抢夺物品')).toHaveValue('card:21');s.paused=false;view.rerender(<ItemPanel {...props}/>);fireEvent.click(confirm);expect(props.onUse).toHaveBeenLastCalledWith({type:'confirm',decisionId:'rob',target:{kind:'player',id:'player-2'}},undefined,'card:21');fireEvent.change(screen.getByLabelText('目标玩家'),{target:{value:'player-3'}});expect(screen.getByLabelText('抢夺物品')).toHaveValue('');expect(confirm).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'取消使用'}));expect(props.onUse).toHaveBeenLastCalledWith({type:'cancel',decisionId:'rob'});
});
it('presents correct responder and separate optional choices; pause disables both and stale rejection is visible',()=>{
 const {snapshot:s}=fixture();s.phase='reaction';s.reaction={kind:'reaction',id:'react',responderId:'player-2',stage:'redirect',targets:['player-1','player-3'],continuation:{kind:'attack',sourceId:'player-1',originalId:'player-2',itemId:'card:17'}};
 const respond=vi.fn(()=>true);const view=render(<ReactionPanel snapshot={s} respond={respond}/>);expect(screen.getByRole('heading')).toHaveTextContent('玩家 2');const yes=screen.getByRole('button',{name:'使用嫁祸卡'});expect(yes).toBeDisabled();fireEvent.change(screen.getByLabelText('嫁祸目标'),{target:{value:'player-3'}});s.paused=true;view.rerender(<ReactionPanel snapshot={s} respond={respond}/>);expect(yes).toBeDisabled();expect(screen.getByRole('button',{name:'不使用嫁祸卡'})).toBeDisabled();s.paused=false;respond.mockReturnValue(false);view.rerender(<ReactionPanel snapshot={s} respond={respond}/>);fireEvent.click(yes);expect(respond).toHaveBeenLastCalledWith('react','use','player-3');expect(screen.getByRole('alert')).toHaveTextContent('未消耗');fireEvent.click(screen.getByRole('button',{name:'不使用嫁祸卡'}));expect(respond).toHaveBeenLastCalledWith('react','decline',undefined);
});
it('all six shop entries enforce points/pool/capacity and passive cards have no active-use button',()=>{
 const props=fixture(),s=props.snapshot;const view=render(<ItemPanel {...props}/>);for(const good of G3_GOODS.filter(g=>g.passive))expect(screen.queryByRole('button',{name:'使用'+good.name})).toBeNull();
 s.phase='shop';s.shopDecision={kind:'shop',id:'shop',node:50,companyId:'japan:company:1'};s.items!.points['player-1']=1000;view.rerender(<ItemPanel {...props}/>);
 for(const g of G3_GOODS){const button=screen.getByRole('button',{name:'购买'+g.name});expect(button).toBeEnabled();fireEvent.click(button);expect(props.buy).toHaveBeenLastCalledWith('shop',g.id);}
 s.effects!.inventory['player-1']['card:03']=15;view.rerender(<ItemPanel {...props}/>);for(const g of G3_GOODS)expect(screen.getByRole('button',{name:'购买'+g.name})).toBeDisabled();
});

it('fortune reaction displays hospital duration and never card-attack 4/5 or rent semantics',()=>{
 const {snapshot:s}=fixture();s.phase='reaction';s.reaction={kind:'reaction',id:'tf',responderId:'player-1',stage:'redirect',targets:['player-2'],continuation:{kind:'trafficDetention',originalId:'player-1',decision:{kind:'fortune',id:'f',node:19,fortuneId:13,title:'机车摔伤',lines:['将住院 6 次行动，先处理免罪/嫁祸。']},skipped:[],change:{traffic:{kind:'hospital',turns:6}} as import('./game/fortune').FortuneChange}};
 const react=vi.fn(()=>true);render(<ReactionPanel snapshot={s} respond={react}/>);expect(screen.getByRole('region',{name:'反应决策'})).toHaveTextContent('实际目标住院6次');expect(screen.queryByText(/本次应付租金/)).toBeNull();expect(screen.getByRole('button',{name:'使用嫁祸卡'})).toBeDisabled();fireEvent.change(screen.getByRole('combobox'),{target:{value:'player-2'}});fireEvent.click(screen.getByRole('button',{name:'使用嫁祸卡'}));expect(react).toHaveBeenCalledExactlyOnceWith('tf','use','player-2');
});

it('travel reaction shows the actual travel term and exact chosen target',()=>{
 const {snapshot:s}=fixture();s.phase='reaction';s.reaction={kind:'reaction',id:'travel',responderId:'player-1',stage:'redirect',targets:['player-2'],continuation:{kind:'fortuneTravel',originalId:'player-1',decision:{kind:'fortune',id:'f',node:19,fortuneId:7,title:'被外星人绑架',lines:['将被绑架 6 次行动，先处理免罪/嫁祸。']},skipped:[],change:{final:{turns:6,mode:1}} as import('./game/fortune').FortuneChange}};
 const respond=vi.fn(()=>true);render(<ReactionPanel snapshot={s} respond={respond}/>);expect(screen.getByRole('region',{name:'反应决策'})).toHaveTextContent('实际目标暂离地图6次');fireEvent.change(screen.getByRole('combobox'),{target:{value:'player-2'}});fireEvent.click(screen.getByRole('button',{name:'使用嫁祸卡'}));expect(respond).toHaveBeenCalledExactlyOnceWith('travel','use','player-2');
});
it.each(['hospital','prison'] as const)('magic %s reaction shows seat progress, intended detention and vehicle preservation',detention=>{const{snapshot:s}=fixture();s.phase='reaction';s.reaction={kind:'reaction',id:'magic',responderId:'player-2',stage:'redirect',targets:['player-1','player-3'],continuation:{kind:'magicDetention',batchId:'b',cursor:1,total:3,detention,originalId:'player-2'}};const respond=vi.fn(()=>true);render(<ReactionPanel snapshot={s} respond={respond}/>);expect(screen.getByRole('region',{name:'反应决策'})).toHaveTextContent(`魔法屋${detention==='hospital'?'住院':'坐牢'}三回合：第 2/3 位`);expect(screen.getByRole('region',{name:'反应决策'})).toHaveTextContent('保留车辆');fireEvent.change(screen.getByLabelText('嫁祸目标'),{target:{value:'player-3'}});fireEvent.click(screen.getByRole('button',{name:'使用嫁祸卡'}));expect(respond).toHaveBeenCalledWith('magic','use','player-3');});
it('clears the previous responder target even when the next responder has the same legal target',()=>{
 const {snapshot:s}=fixture();s.phase='reaction';s.reaction={kind:'reaction',id:'react',responderId:'player-2',stage:'redirect',targets:['player-1','player-3'],continuation:{kind:'attack',sourceId:'player-1',originalId:'player-2',itemId:'card:17'}};
 const respond=vi.fn(()=>true),view=render(<ReactionPanel snapshot={s} respond={respond}/>);
 fireEvent.change(screen.getByLabelText('嫁祸目标'),{target:{value:'player-1'}});
 view.rerender(<ReactionPanel snapshot={{...s,reaction:{...s.reaction,responderId:'player-3',targets:['player-1','player-2']}}} respond={respond}/>);
 expect(screen.getByLabelText('嫁祸目标')).toHaveValue('');expect(screen.getByRole('button',{name:'使用嫁祸卡'})).toBeDisabled();expect(respond).not.toHaveBeenCalled();
});
