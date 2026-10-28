import { expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { GameEngine } from '../game/engine';
import type { Replay } from '../game/engine';
import { GameHost } from '../../../../../shared/richman/host';
import { SERVER_MANIFEST } from '../../../../../shared/richman/content';
import { projectGame } from '../../../../../shared/richman/projection';
import { decisionPlayer } from '../game/computer';
import replayData from '../game/fixtures/presentation-v47-paid-upgrade-tuu-replay.json';
import { networkSnapshot } from './view';
import { ItemPanel } from '../ItemPanel';
import { G6Panel } from '../G6Panel';
import { FinancePanel } from '../FinancePanel';
import { PropertyPanel } from '../PropertyPanel';
import { AuctionPanel } from '../G4Choice';
import { ReactionPanel } from '../G3Choice';
import { MinigamePanel } from '../MinigamePanel';
import { MagicPanel } from '../MagicPanel';
import { FortunePanel } from '../FortunePanel';
import { NewsPanel } from '../NewsPanel';
import { CommercePanel } from '../CommercePanel';
import { CompanyPanel } from '../CompanyPanel';
import { LotteryPanel } from '../LotteryPanel';
import { CalendarPanel } from '../CalendarPanel';
import { InsurancePanel } from '../InsurancePanel';
import { ResearchPanel, G5Status } from '../G5Panel';
import { FacilityPanel } from '../SiteServicesPanel';
import { EstateSalesPanel } from '../EstateSalesPanel';
import { SurrenderPanel } from '../SurrenderPanel';
const yes = () => true;
it('renders public projections of legal replay decisions with the existing business windows', () => {
  const replay = replayData as unknown as Replay, engine = new GameEngine(SERVER_MANIFEST.map.nodes, replay.config), seen = new Set<string>();
  for (let index = 0; index < replay.commands.length; index++) {
    const state = engine.state, p = state.pending;
    const key = p ? `${p.kind}:${'stage' in p ? p.stage : ''}:${p.kind === 'minigame' ? p.game : p.kind === 'reaction' ? p.continuation.kind : ''}` : state.phase;
    if (!seen.has(key)) {
      seen.add(key);
      const seats = state.players.map(player => ({ playerId: player.id, characterId: player.characterId, userId: player.id, policy: null }));
      const host = GameHost.restore({ hostVersion: 1, engine: engine.checkpoint(), seats, researchMemory: {}, clock: { key: '', elapsed: 0 } });
      for (const self of state.players.map(player => player.id)) {
        const view = { ...projectGame(host, self, new Set()), canControl: true, hostError: null };
        const s = networkSnapshot(view, SERVER_MANIFEST, { connected: true, pending: false, readOnly: false, message: '' });
        const serialized = JSON.stringify(view);
        for (const forbidden of ['randomState','researchMemory','world','order','noise','momentum']) expect(serialized, `${index}/${key}`).not.toContain(`"${forbidden}"`);
        for (const other of state.players.filter(player => player.id !== self)) expect(view.presentation.inventory[other.id]).toEqual({});
        expect(s.network?.waiting).toBe(decisionPlayer(state) !== self);
        expect(() => renderToString(<>
          <ItemPanel snapshot={s} onUse={yes} buy={yes} leave={yes}/><G6Panel snapshot={s} trade={yes}/>
          <FinancePanel snapshot={s} manifest={SERVER_MANIFEST} transfer={yes} leaveBank={yes} settleDebt={yes} newGame={yes}/>
          <PropertyPanel snapshot={s} manifest={SERVER_MANIFEST} decide={yes}/>
          {s.auction && <AuctionPanel snapshot={s} bid={yes}/>}{s.reaction && <ReactionPanel snapshot={s} respond={yes}/>}
          {s.minigame && <MinigamePanel decision={s.minigame} paused={false} act={yes}/>}
          {s.magicDecision && <MagicPanel decision={s.magicDecision} paused={false} act={yes} build={yes}/>}
          {s.fortuneDecision && <FortunePanel decision={s.fortuneDecision} paused={false} collect={yes} acknowledge={yes}/>}
          {s.newsDecision && <NewsPanel decision={s.newsDecision} paused={false} acknowledge={yes}/>}
          <CommercePanel snapshot={s} construct={yes} subscribe={yes} locate={yes}/><CompanyPanel snapshot={s} ack={yes}/><LotteryPanel snapshot={s} buy={yes} leave={yes}/>
          <CalendarPanel snapshot={s}/><InsurancePanel snapshot={s} spin={yes}/><ResearchPanel snapshot={s} start={yes}/><G5Status snapshot={s}/>
          {s.facilityDecision && <FacilityPanel snapshot={s} act={yes}/>}<EstateSalesPanel snapshot={s} act={yes}/>
          <SurrenderPanel snapshot={s} confirming={false} setConfirming={yes} surrender={yes} chooseDeath={yes}/>
        </>), `projection window at ${index}/${key}/${self}`).not.toThrow();
      }
    }
    const result = engine.dispatch(replay.commands[index]); expect(result.ok, `legal fixture ${index}`).toBe(true);
  }
  expect(seen.size).toBeGreaterThan(20);
}, 60000);
