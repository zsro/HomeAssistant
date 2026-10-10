import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ItemPanel } from './ItemPanel';
import { GameSession } from './game/session';
import { WEALTH_CARD, WEALTH_EFFECT } from './game/wealth';
import type { Manifest } from './types';
import nodes from './japan-topology.fixture.json';
afterEach(cleanup);
const manifest: Manifest={version:1,map:{name:'日本',width:2304,height:2304,nodes,scenery:[]},sprites:{},characters:['小美','土伯','夫人','沙隆'].map((name,i)=>({id:String(i),name,color:'#fff',idle:[],walk:[],walkFramesPerDirection:10}))};
function fixture(){
  const session=new GameSession(manifest,{id:()=> 'wealth-ui',seed:()=> 'wealth-ui'});
  session.start({mode:'wealth',characterIds:['1','2','3'],seed:'ui'});
  const snapshot=session.snapshot();snapshot.effects!.inventory['player-1'][WEALTH_CARD]=1;
  snapshot.effects!.pending={id:'decision-1',definitionId:WEALTH_EFFECT,playerId:'player-1',timing:'beforeRoll'};snapshot.phase='effect';
  snapshot.wealthPlayers!.forEach((p,i)=>{p.cash=[1001,4000,0][i]});
  return {snapshot,onUse:vi.fn(()=>true),buy:vi.fn(()=>true),leave:vi.fn()};
}
it('previews all three roster players including zero cash and self without target selection',()=>{
  const props=fixture();render(<ItemPanel {...props}/>);expect(screen.queryAllByRole('radio')).toHaveLength(0);
  const preview=screen.getByLabelText('均富卡结算预览');expect(preview).toHaveTextContent('土伯（你）：1,001 → 1,667');expect(preview).toHaveTextContent('夫人：4,000 → 1,667');expect(preview).toHaveTextContent('沙隆：0 → 1,667');
  fireEvent.click(screen.getByRole('button',{name:'确认使用均富卡'}));expect(props.onUse).toHaveBeenCalledWith({type:'confirm',decisionId:'decision-1',target:{kind:'player',id:'player-1'}});
});
it('shows remainder and cash-loss warnings, blocks pause, cancels and reports rejected confirmation',()=>{
  const props=fixture();props.snapshot.wealthPlayers![0].cash=5001;const view=render(<ItemPanel {...props}/>);
  expect(screen.getByLabelText('均富卡结算预览')).toHaveTextContent('你的现金将减少');
  props.snapshot.wealthPlayers![0].cash=5002;props.snapshot.paused=true;view.rerender(<ItemPanel {...props}/>);
  expect(screen.getByLabelText('均富卡结算预览')).toHaveTextContent('现金总额减少 2 元');
  expect(screen.getByRole('button',{name:'确认使用均富卡'})).toBeDisabled();expect(screen.getByRole('button',{name:'取消使用'})).toBeDisabled();
  props.snapshot.paused=false;props.onUse.mockReturnValue(false);view.rerender(<ItemPanel {...props}/>);fireEvent.click(screen.getByRole('button',{name:'确认使用均富卡'}));expect(screen.getByRole('alert')).toHaveTextContent('未消耗卡片');
  fireEvent.click(screen.getByRole('button',{name:'取消使用'}));expect(props.onUse).toHaveBeenLastCalledWith({type:'cancel',decisionId:'decision-1'});
  props.snapshot.effects!.pending!.id='decision-2';props.snapshot.wealthPlayers!.forEach(p=>{p.cash=0});view.rerender(<ItemPanel {...props}/>);expect(screen.queryByRole('alert')).toBeNull();expect(screen.getByText('全员现金相同，确认仍会消耗卡片。')).toBeInTheDocument();
});
it('shows independent stock and shared capacity for both cards with purchase gates',()=>{
  const props=fixture(),s=props.snapshot;s.phase='shop';s.effects!.pending=null;s.shopDecision={kind:'shop',id:'shop',node:50,companyId:'japan:company:1'};
  s.items!.points['player-1']=199;const view=render(<ItemPanel {...props}/>);const button=()=>screen.getByRole('button',{name:'购买均富卡'});
  expect(button()).toBeDisabled();s.items!.points['player-1']=200;view.rerender(<ItemPanel {...props}/>);fireEvent.click(button());expect(props.buy).toHaveBeenCalledWith('shop','card:01');
  s.wealth!.supply=0;view.rerender(<ItemPanel {...props}/>);expect(button()).toBeDisabled();expect(screen.getByRole('button',{name:'购买均贫卡'})).toBeEnabled();
  s.wealth!.supply=1;s.effects!.inventory['player-1']['card:02']=14;view.rerender(<ItemPanel {...props}/>);expect(button()).toBeDisabled();expect(screen.getByRole('button',{name:'购买均贫卡'})).toBeDisabled();expect(within(screen.getByRole('region',{name:'我的均富卡'})).getByText(/卡片 15\/15/)).toBeInTheDocument();
});
