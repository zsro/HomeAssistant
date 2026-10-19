import { useState } from 'react';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ClassicTitleMenu } from './ClassicTitleMenu';
import { ClassicSetupForm, type SetupDraft } from './ClassicSetupForm';
import { SETUP_MODES, hasCalendar, hasComputer, hasFunds } from './setup-options';
import { ClassicGameShell } from './ClassicGameShell';
import { GameSession } from './game/session';
import type { Manifest } from './types';
import nodes from './japan-topology.fixture.json';
const manifest: Manifest = {version:1,map:{name:'日本',width:2304,height:2304,nodes,scenery:[]},sprites:{},characters:['a','b','c','d'].map(id=>({id,name:id,color:'#fff',idle:[],walk:[],walkFramesPerDirection:10}))};
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
it('keeps four local title entries and sends distinct START/LOAD/OPTION/EXIT actions',()=>{
 const select=vi.fn();render(<ClassicTitleMenu onSelect={select}/>);
 for(const [name,id] of [['START · 新建对局','start'],['LOAD · 读档（暂未接入）','load'],['OPTION · 设置','options'],['EXIT · 返回模块集合','exit']]){fireEvent.click(screen.getByRole('button',{name}));expect(select).toHaveBeenLastCalledWith(id);}
 expect(screen.getAllByRole('button')).toHaveLength(4);
});
it('retains every historical mode and editable seed without changing the basic roster',()=>{
 const submit=vi.fn(),cancel=vi.fn();
 function Form(){const[d,set]=useState<SetupDraft>({mode:'surrender',ids:['a','b'],computers:[],policy:'basic-v1',funds:50000,date:'1998-01-01',seed:''});return <ClassicSetupForm manifest={manifest} draft={d} onChange={p=>set({...d,...p})} error="" onSubmit={submit} onCancel={cancel}/>;}
 render(<Form/>);expect(screen.getByRole('checkbox',{name:'a'})).toBeChecked();expect(screen.getByRole('checkbox',{name:'c'})).not.toBeChecked();
 fireEvent.click(screen.getByRole('checkbox',{name:'c'}));expect(screen.getByLabelText('c控制方式')).toHaveValue('human');
 fireEvent.change(screen.getByLabelText('c控制方式'),{target:{value:'computer'}});expect(screen.getByLabelText('c控制方式')).toHaveValue('computer');
 fireEvent.click(screen.getByText('高级设置 · 历史模式、电脑策略与种子'));const modes=screen.getByLabelText('游戏模式');expect(modes.querySelectorAll('option')).toHaveLength(SETUP_MODES.length);
 fireEvent.change(modes,{target:{value:'turns'}});expect(screen.queryByLabelText(/每人初始资金/)).toBeNull();expect(screen.queryByLabelText('开局日期')).toBeNull();expect(screen.queryByLabelText('c控制方式')).toBeNull();
 fireEvent.change(screen.getByLabelText(/对局种子/),{target:{value:'preserved'}});fireEvent.change(modes,{target:{value:'surrender'}});expect(screen.getByLabelText(/对局种子/)).toHaveValue('preserved');expect(screen.getByLabelText('c控制方式')).toHaveValue('computer');
 fireEvent.click(screen.getByRole('button',{name:'取消'}));expect(cancel).toHaveBeenCalledOnce();expect(submit).not.toHaveBeenCalled();
});
it('setup presentation gates match the previous supported mode families',()=>{
 expect(SETUP_MODES.map(m=>m.id)).toContain('sandbox');expect(SETUP_MODES.map(m=>m.id)).toContain('economy');
 expect(SETUP_MODES.filter(m=>!hasFunds(m.id)).map(m=>m.id).sort()).toEqual(['sandbox','turns']);
 expect(SETUP_MODES.filter(m=>hasComputer(m.id)).map(m=>m.id).sort()).toEqual(['godPairs','specialObjects','stockCircuit','surrender']);
 expect(hasCalendar('calendar')).toBe(true);expect(hasCalendar('finalFortune')).toBe(false);expect(hasCalendar('surrender')).toBe(true);
});
it('rotation changes layout while retaining the same map element and input state',()=>{
 let width=1000;vi.spyOn(HTMLElement.prototype,'clientWidth','get').mockImplementation(()=>width);vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
 const s=new GameSession(manifest).snapshot();render(<ClassicGameShell manifest={manifest} snapshot={s} ready onOpen={()=>{}} onGo={()=>{}} onDiceCount={()=>{}} auxiliaryView="calendar" onAuxiliaryView={()=>{}} onPan={()=>{}}><input aria-label="persistent map probe" defaultValue="draft"/></ClassicGameShell>);
 const input=screen.getByLabelText('persistent map probe');fireEvent.change(input,{target:{value:'same canvas state'}});
 act(()=>{width=390;window.dispatchEvent(new Event('resize'));});expect(document.querySelector('.rm-classic-frame')).toHaveClass('is-compact');expect(screen.getByLabelText('persistent map probe')).toBe(input);expect(input).toHaveValue('same canvas state');
 act(()=>{width=1000;window.dispatchEvent(new Event('resize'));});expect(document.querySelector('.rm-classic-frame')).not.toHaveClass('is-compact');expect(screen.getByLabelText('persistent map probe')).toBe(input);
});
