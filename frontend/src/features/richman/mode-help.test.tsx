import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { GameSession, type SessionOptions } from './game/session';
import type { Manifest } from './types';
import nodes from './japan-topology.fixture.json';
import { CompanyPanel } from './CompanyPanel';
import { CommercePanel } from './CommercePanel';
import { DividendPanel } from './DividendPanel';
import { CalendarPanel } from './CalendarPanel';
import { GameHelp } from './GameHelp';
import { PropertyPanel } from './PropertyPanel';
import { modeIncludes } from './mode-help';

afterEach(cleanup);
const manifest: Manifest = { version: 1, map: { name: '日本', width: 2304, height: 2304, nodes, scenery: [] }, sprites: {}, characters: ['a','b','c','d'].map(id => ({ id, name:id, color:'#fff', idle:[], walk:[], walkFramesPerDirection:10 })) };
function snapshot(mode: SessionOptions['mode']) {
  const session = new GameSession(manifest);
  session.start({mode, characterIds:['a','b'], seed:'help-audit', startDate:'1998-01-07'});
  return session.snapshot();
}
const modes: SessionOptions['mode'][] = ['economy','g7','calendar','lottery','dividends','company','commerce','insurance','dateBusiness','indexedEconomy','estateSales','disposal','payments','batches','magic','magicActions','magicNested','siteServices','shopAcquisition','minigames','stockMarket','stockLedger','stockCircuit','godPairs','specialObjects','surrender'];
it.each(modes)('%s help inheritance agrees with the real session state', mode => {
  const s = snapshot(mode);
  expect(modeIncludes(mode,'calendar')).toBe(!!s.calendar);
  expect(modeIncludes(mode,'insurance')).toBe(!!s.news?.business?.insurance);
  expect(modeIncludes(mode,'commerce')).toBe(s.news?.business?.construction !== undefined);
  expect(modeIncludes(mode,'dateBusiness')).toBe(!!s.calendar?.business);
  render(<GameHelp snapshot={s}/>);
  expect(screen.getByText(s.calendar?.business ? /本局物价随日期/ : /本局沿用固定物价/)).toBeInTheDocument();
});
it.each(['stockMarket','stockLedger','stockCircuit','godPairs','specialObjects','surrender'] as const)('%s no longer describes implemented business as missing', mode => {
  const s = snapshot(mode);
  const {container} = render(<><CompanyPanel snapshot={s} ack={vi.fn()}/><CommercePanel snapshot={s} construct={vi.fn()} subscribe={vi.fn()} locate={vi.fn()}/><DividendPanel snapshot={s}/><CalendarPanel snapshot={s}/></>);
  expect(container).toHaveTextContent('三井保险服务见保险面板');
  expect(container).toHaveTextContent('地产购买/建造/租金');
  expect(container).toHaveTextContent('本模式保费实收与赔款均进入公司账本');
  expect(container).not.toHaveTextContent('保险尚未');
  expect(container).not.toHaveTextContent('保险及现场认股未接入');
  expect(container).toHaveTextContent('不能救活退出者或代付原债');
});
it('historical company mode still describes construction and insurance as unavailable', () => {
  render(<CompanyPanel snapshot={snapshot('company')} ack={vi.fn()}/>);
  expect(screen.getByText(/日产建造、保险及现场认股未接入/)).toBeInTheDocument();
});
it('current property header displays the actual price index instead of a fixed one', () => {
  const s = snapshot('surrender');
  s.calendar!.business!.priceIndex = 3;
  render(<PropertyPanel snapshot={s} manifest={manifest} decide={vi.fn()}/>);
  expect(screen.getByText(/物价 ×3/)).toBeInTheDocument();
});
it.each(['turns','sandbox'] as const)('%s does not promise economic settlements', mode => {
  render(<GameHelp snapshot={snapshot(mode)}/>);
  expect(screen.queryByText(/开局现金/)).toBeNull();
});
