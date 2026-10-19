import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AuctionPanel } from './G4Choice';
import { SurrenderPanel } from './SurrenderPanel';
import { GameSession } from './game/session';
import { PROPERTY_CATALOG } from './game/economy';
import type { Manifest } from './types';
import nodes from './japan-topology.fixture.json';
import { decisionWindow } from './window-state';
const manifest: Manifest = { version: 1, map: { name: '日本', width: 2304, height: 2304, nodes, scenery: [] }, sprites: {}, characters: ['a','b','c'].map(id=>({id,name:id,color:'#fff',idle:[],walk:[],walkFramesPerDirection:10})) };
function fixture() { return new GameSession(manifest,{id:()=> 'ui06',seed:()=> 'ui06'},'surrender').snapshot(); }
afterEach(cleanup);
it('auction buttons use the actual responder cash, exact increment and permanent withdrawal command',()=>{
 const s=fixture(),bid=vi.fn(()=>true);s.phase='auction';s.auction={kind:'auction',id:'auction',propertyId:PROPERTY_CATALOG.properties[0].id,sourceId:'player-1',originalOwner:null,reserve:500,bid:500,leader:null,responderId:'player-2',remaining:['player-2','player-3']};s.economy!.balances['player-2'].cash=1000;
 const v=render(<AuctionPanel snapshot={s} bid={bid}/>);expect(screen.getByText(/请玩家 2 竞价/)).toHaveTextContent('1,000');
 expect(screen.getByRole('button',{name:'加价 500'})).toBeEnabled();expect(screen.getByRole('button',{name:'加价 1,000'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'加价 500'}));expect(bid).toHaveBeenLastCalledWith('auction',500);
 v.rerender(<AuctionPanel snapshot={{...s,paused:true}} bid={bid}/>);for(const b of screen.getAllByRole('button'))expect(b).toBeDisabled();
 v.rerender(<AuctionPanel snapshot={s} bid={bid}/>);fireEvent.click(screen.getByRole('button',{name:'退出竞价'}));expect(bid).toHaveBeenLastCalledWith('auction',null);
 expect(screen.getByRole('button',{name:'PASS · 暂未接入'})).toBeDisabled();
});
it('surrender requires explicit confirmation, cancel does not submit, and rejected commands retain the form',()=>{
 const s=fixture();s.canSurrender=true;const surrender=vi.fn(()=>false),chooseDeath=vi.fn(()=>true);
 function Harness(){const[confirming,setConfirming]=useState(false);return <SurrenderPanel snapshot={s} confirming={confirming} setConfirming={setConfirming} surrender={surrender} chooseDeath={chooseDeath}/>;}
 render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'认输退出本局'}));expect(surrender).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'继续对局'}));expect(surrender).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'认输退出本局'}));
 fireEvent.click(screen.getByRole('button',{name:'确认认输'}));expect(surrender).toHaveBeenCalledTimes(1);expect(screen.getByRole('alert')).toBeTruthy();expect(screen.getByRole('button',{name:'确认认输'})).toBeEnabled();
});
it('post-surrender choice uses the pending token and cannot undo exit',()=>{
 const s=fixture();s.surrenderDecision={kind:'surrender',id:'death',sourceId:'player-1',targets:['player-2','player-3']};const chooseDeath=vi.fn(()=>true),surrender=vi.fn(()=>true),props={snapshot:s,confirming:false,setConfirming:vi.fn(),surrender,chooseDeath};
 const v=render(<SurrenderPanel {...props}/>);fireEvent.click(screen.getByRole('button',{name:'衰神附身玩家 3'}));expect(chooseDeath).toHaveBeenLastCalledWith('death','player-3');
 fireEvent.click(screen.getByRole('button',{name:'放弃附身'}));expect(chooseDeath).toHaveBeenLastCalledWith('death',null);expect(surrender).not.toHaveBeenCalled();
 v.rerender(<SurrenderPanel {...props} snapshot={{...s,paused:true}}/>);for(const b of screen.getAllByRole('button'))expect(b).toBeDisabled();
});
it('window identity follows magic stage/build responder and minigame stage without stealing focus every tick',()=>{
 const s=fixture();s.phase='magic';s.magicDecision={kind:'magic',id:'magic',node:35,stage:'choose',targets:['player-2'],group:1};const key=decisionWindow(s)!.key;
 s.magicDecision.stage='build';s.magicDecision.responderId='player-2';expect(decisionWindow(s)!.key).not.toBe(key);const buildKey=decisionWindow(s)!.key;
 s.magicDecision.responderId='player-3';expect(decisionWindow(s)!.key).not.toBe(buildKey);
 s.magicDecision=null;s.phase='minigame';s.minigame={kind:'minigame',id:'mini',node:24,game:'balloon',stage:'ready',tick:0,remaining:150,score:0,reason:null,freeze:0,speed:0};
 const ready=decisionWindow(s)!.key;s.minigame.stage='playing';const playing=decisionWindow(s)!.key;expect(playing).not.toBe(ready);
 s.minigame.tick=10;s.minigame.remaining=140;s.minigame.score=12;s.revision++;expect(decisionWindow(s)!.key).toBe(playing);
 s.minigame.stage='result';expect(decisionWindow(s)!.key).not.toBe(playing);
});
