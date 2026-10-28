import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ItemPanel } from './ItemPanel';
import { GameSession } from './game/session';
import { G1_GOODS } from './game/g1';
import type { Manifest } from './types';
import nodes from '../../../../shared/richman/japan-topology.fixture.json';
afterEach(cleanup);
const manifest:Manifest={version:1,map:{name:'日本',width:2304,height:2304,nodes,scenery:[]},sprites:{},characters:['小美','土伯','夫人','沙隆'].map((name,i)=>({id:String(i),name,color:'#fff',idle:[],walk:[],walkFramesPerDirection:10}))};
function fixture(index=0){const session=new GameSession(manifest);session.start({mode:'g1',characterIds:['1','3'],seed:'ui-g1'});const snapshot=session.snapshot(),good=G1_GOODS[index];
  snapshot.phase='effect';snapshot.effects!.pending={id:'decision-1',definitionId:good.effect,playerId:'player-1',timing:'beforeRoll'};
  snapshot.g1Choices![good.id]=[{target:{kind:good.target,id:good.target==='player'?'player-2':'japan:land:1'},title:'目标预览',detail:'产权或建筑的结算变化',changes:[]}];
  return{snapshot,onUse:vi.fn(()=>true),buy:vi.fn(()=>true),leave:vi.fn(),preview:vi.fn()};
}
it.each(G1_GOODS.map((g,i)=>({good:g,index:i})))('previews and confirms $good.name with the declared target type',({good,index})=>{
  const props=fixture(index);render(<ItemPanel {...props}/>);const select=screen.getByRole('combobox'),confirm=screen.getByRole('button',{name:`确认使用${good.name}`});
  if(good.id==='card:03'){expect(select).toBeDisabled();expect(confirm).toBeEnabled();}else{expect(confirm).toBeDisabled();fireEvent.change(select,{target:{value:props.snapshot.g1Choices![good.id][0].target.id}});}
  expect(screen.getByLabelText(`${good.name}结算预览`)).toHaveTextContent('结算变化');fireEvent.click(confirm);
  expect(props.onUse).toHaveBeenCalledWith({type:'confirm',decisionId:'decision-1',target:props.snapshot.g1Choices![good.id][0].target});
  if(good.target==='property'){fireEvent.click(screen.getByRole('button',{name:'定位目标地块'}));expect(props.preview).toHaveBeenCalledWith('japan:land:1');}
});
it('retains selection while paused, clears new decisions and reports invalidation without consuming',()=>{
  const props=fixture(1);const view=render(<ItemPanel {...props}/>);fireEvent.change(screen.getByRole('combobox'),{target:{value:'japan:land:1'}});
  props.snapshot.paused=true;view.rerender(<ItemPanel {...props}/>);expect(screen.getByRole('combobox')).toHaveValue('japan:land:1');expect(screen.getByRole('combobox')).toBeDisabled();expect(screen.getByRole('button',{name:'取消使用'})).toBeDisabled();expect(screen.getByRole('button',{name:'确认使用换地卡'})).toBeDisabled();
  props.snapshot.paused=false;props.onUse.mockReturnValue(false);view.rerender(<ItemPanel {...props}/>);fireEvent.click(screen.getByRole('button',{name:'确认使用换地卡'}));expect(screen.getByRole('alert')).toHaveTextContent('未消耗卡片');
  props.snapshot.effects!.pending!.id='new';view.rerender(<ItemPanel {...props}/>);expect(screen.getByRole('combobox')).toHaveValue('');expect(screen.queryByRole('alert')).toBeNull();
  props.snapshot.g1Choices!['card:04']=[];view.rerender(<ItemPanel {...props}/>);expect(screen.getByRole('button',{name:'确认使用换地卡'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'取消使用'}));expect(props.onUse).toHaveBeenLastCalledWith({type:'cancel',decisionId:'new'});
});
it('shows five independent prices/stocks and respects shared card capacity and pause at the shop',()=>{
  const props=fixture(),s=props.snapshot;s.phase='shop';s.effects!.pending=null;s.shopDecision={kind:'shop',id:'shop',node:50,companyId:'japan:company:1'};s.items!.points['player-1']=100;
  const view=render(<ItemPanel {...props}/>);
  for(const g of G1_GOODS){expect(screen.getByText(`单价 ${g.price} 点 · 剩余 ${g.supply} 张`)).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:`购买${g.name}`}));expect(props.buy).toHaveBeenLastCalledWith('shop',g.id);}
  s.items!.points['player-1']=19;view.rerender(<ItemPanel {...props}/>);expect(screen.getByRole('button',{name:'购买拆除卡'})).toBeEnabled();expect(screen.getByRole('button',{name:'购买购地卡'})).toBeDisabled();
  s.g1!.supply['card:12']=0;view.rerender(<ItemPanel {...props}/>);expect(screen.getByRole('button',{name:'购买拆除卡'})).toBeDisabled();
  s.items!.points['player-1']=1000;s.effects!.inventory['player-1']['card:02']=15;view.rerender(<ItemPanel {...props}/>);for(const g of G1_GOODS)expect(screen.getByRole('button',{name:`购买${g.name}`})).toBeDisabled();
});
