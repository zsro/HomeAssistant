import {render, cleanup} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {GameSession} from './game/session';
import type {Manifest} from './types';
import nodes from './japan-topology.fixture.json';
import {NEARBY_WORKER_EFFECT} from './game/nearby-construction';
import {ItemPanel} from './ItemPanel';
import {GameHelp} from './GameHelp';
import {decisionSelector, navigateGame} from './decision-navigation';

afterEach(()=>{cleanup();vi.restoreAllMocks()});
it('opens the collapsed workbench and nested details before focusing a live business panel', () => {
 const {container}=render(<details className="workbench"><summary>操作面板</summary><details><summary>内层</summary><section className="target"><button>确认</button></section></details></details>);
 HTMLElement.prototype.scrollIntoView=vi.fn();
 expect(navigateGame(container,'.target')).toBe(true);
 expect([...container.querySelectorAll('details')].every(d=>d.open)).toBe(true);
 expect(document.activeElement).toBe(container.querySelector('.target'));
});
const manifest:Manifest={version:1,map:{name:'日本',width:2304,height:2304,nodes,scenery:[]},sprites:{},characters:['a','b'].map(id=>({id,name:id,color:'#fff',idle:[],walk:[],walkFramesPerDirection:10}))};
it('focuses the real worker panel without choosing, consuming or submitting while paused',()=>{
 const session=new GameSession(manifest,undefined,'surrender');
 expect(session.useItem({type:'begin',definitionId:NEARBY_WORKER_EFFECT})?.ok).toBe(true);
 session.pause(true);const before=session.exportReplay(),act=vi.fn(()=>true);
 const {container}=render(<ItemPanel snapshot={session.state} onUse={act} buy={()=>true} leave={()=>undefined}/>);
 const scroll=vi.fn();HTMLElement.prototype.scrollIntoView=scroll;
 expect(navigateGame(container,decisionSelector(session.state))).toBe(true);
 expect(document.activeElement?.getAttribute('aria-label')).toBe('机器工人选择');
 expect(scroll).toHaveBeenCalled();expect(act).not.toHaveBeenCalled();expect(session.exportReplay()).toEqual(before);
 expect(container.querySelector('input:checked')).toBeNull();session.dispose();
});
it('opens actual help and transfers focus, tolerates absent target after decision changes',()=>{
 const session=new GameSession(manifest,undefined,'surrender');
 const {container}=render(<GameHelp snapshot={session.state}/>);HTMLElement.prototype.scrollIntoView=vi.fn();
 expect(navigateGame(container,'.rm-help')).toBe(true);expect(container.querySelector('details')?.open).toBe(true);
 expect(document.activeElement).toBe(container.querySelector('details'));
 expect(navigateGame(container,decisionSelector(session.state))).toBe(false);session.dispose();
});

// Isolated component fixture, not an original-map debt browser route.
it('navigates a non-current payer debt panel without settling and keeps paused controls disabled', async()=>{
 const {FinancePanel}=await import('./FinancePanel');
 const session=new GameSession(manifest,undefined,'surrender'),snapshot=session.snapshot();
 snapshot.phase='debt';snapshot.paused=true;
 snapshot.debtDecision={kind:'debt',id:'navigation-debt',payerId:'player-2',propertyId:'japan:land:19',recipientId:'player-1',amount:101000,available:100000,shortfall:1000,lines:[]};
 const settleDebt=vi.fn();const {container,getByRole}=render(<FinancePanel snapshot={snapshot} manifest={manifest} transfer={vi.fn()} leaveBank={vi.fn()} settleDebt={settleDebt} newGame={vi.fn()}/>);
 HTMLElement.prototype.scrollIntoView=vi.fn();expect(navigateGame(container,decisionSelector(snapshot))).toBe(true);
 expect(document.activeElement?.getAttribute('aria-label')).toBe('债务处理');
 expect(container.textContent).toContain('付款人：b');expect(getByRole('button',{name:'确认支付现有资金并破产'})).toBeDisabled();expect(settleDebt).not.toHaveBeenCalled();session.dispose();
});
