import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ItemPanel } from './ItemPanel';
import { GameSession } from './game/session';
import { EQUAL_CASH, EQUAL_CASH_EFFECT } from './game/cards';
import type { Manifest } from './types';
import nodes from '../../../../shared/richman/japan-topology.fixture.json';
afterEach(cleanup);
const manifest: Manifest={version:1,map:{name:'日本',width:2304,height:2304,nodes,scenery:[]},sprites:{},characters:['小美','土伯','夫人','沙隆'].map((name,i)=>({id:String(i),name,color:'#fff',idle:[],walk:[],walkFramesPerDirection:10}))};
function fixture(){
  const session=new GameSession(manifest,{id:()=> 'cards-ui',seed:()=> 'cards-ui'});
  session.start({mode:'cards',characterIds:['1','3'],seed:'ui'});
  const snapshot=session.snapshot();snapshot.effects!.inventory['player-1'][EQUAL_CASH]=1;
  snapshot.effects!.pending={id:'decision-1',definitionId:EQUAL_CASH_EFFECT,playerId:'player-1',timing:'beforeRoll'};snapshot.phase='effect';snapshot.cardTargets=[{id:'player-2',characterId:'3',name:'沙隆'}];
  snapshot.economy!.balances['player-1']={cash:1001,bank:99};snapshot.economy!.balances['player-2']={cash:4000,bank:88};
  return {snapshot,onUse:vi.fn(()=>true),buy:vi.fn(()=>true),leave:vi.fn()};
}
it('requires a target, previews odd rounding and submits the roster opponent rather than the character index',()=>{
  const props=fixture();render(<ItemPanel {...props}/>);
  expect(screen.getByRole('button',{name:'确认使用均贫卡'})).toBeDisabled();
  expect(screen.getAllByRole('radio')).toHaveLength(1);fireEvent.click(screen.getByRole('radio',{name:/沙隆/}));
  expect(screen.getByLabelText('均贫卡结算预览')).toHaveTextContent('你的现金：1,001 → 2,500 元');
  expect(screen.getByLabelText('均贫卡结算预览')).toHaveTextContent('合计减少 1 元');
  fireEvent.click(screen.getByRole('button',{name:'确认使用均贫卡'}));
  expect(props.onUse).toHaveBeenCalledWith({type:'confirm',decisionId:'decision-1',target:{kind:'player',id:'player-2'}});
});
it('keeps selection during pause, disables all submissions, and clears it with a new decision',()=>{
  const props=fixture();const view=render(<ItemPanel {...props}/>);fireEvent.click(screen.getByRole('radio'));
  props.snapshot.paused=true;view.rerender(<ItemPanel {...props}/>);
  expect(screen.getByRole('radio')).toBeChecked();expect(screen.getByRole('radio')).toBeDisabled();
  expect(screen.getByRole('button',{name:'确认使用均贫卡'})).toBeDisabled();expect(screen.getByRole('button',{name:'取消使用'})).toBeDisabled();
  props.snapshot.paused=false;props.snapshot.effects!.pending!.id='decision-2';view.rerender(<ItemPanel {...props}/>);
  expect(screen.getByRole('radio')).not.toBeChecked();expect(screen.getByRole('button',{name:'确认使用均贫卡'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'取消使用'}));expect(props.onUse).toHaveBeenCalledWith({type:'cancel',decisionId:'decision-2'});
});
it('warns about equal-cash consumption and giving cash away, and reports rejected confirmation without clearing the target',()=>{
  const props=fixture();props.snapshot.economy!.balances['player-1'].cash=4000;
  const view=render(<ItemPanel {...props}/>);fireEvent.click(screen.getByRole('radio'));
  expect(screen.getByText('双方现金相同，确认仍会消耗卡片。')).toBeInTheDocument();
  props.snapshot.economy!.balances['player-1'].cash=5000;props.onUse.mockReturnValue(false);view.rerender(<ItemPanel {...props}/>);
  expect(screen.getByText('你将让出部分现金给对方。')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'确认使用均贫卡'}));
  expect(screen.getByRole('alert')).toHaveTextContent('未消耗卡片');expect(screen.getByRole('radio')).toBeChecked();
});
it('exposes real shop price, supply and card-only capacity with clear purchase gates',()=>{
  const props=fixture();const s=props.snapshot;s.phase='shop';s.effects!.pending=null;s.shopDecision={kind:'shop',id:'shop-1',node:50,companyId:'japan:company:1'};
  s.items!.points['player-1']=199;const view=render(<ItemPanel {...props}/>);
  expect(screen.getByRole('button',{name:'购买均贫卡'})).toBeDisabled();expect(screen.getByText('单价 200 点 · 剩余 2 张')).toBeInTheDocument();
  s.items!.points['player-1']=200;view.rerender(<ItemPanel {...props}/>);fireEvent.click(screen.getByRole('button',{name:'购买均贫卡'}));expect(props.buy).toHaveBeenCalledWith('shop-1','card:02');
  s.cards!.supply=0;view.rerender(<ItemPanel {...props}/>);expect(screen.getByRole('button',{name:'购买均贫卡'})).toBeDisabled();
  s.cards!.supply=2;s.effects!.inventory['player-1']['card:03']=14;view.rerender(<ItemPanel {...props}/>);expect(screen.getByText('卡片背包已满')).toBeInTheDocument();
});
