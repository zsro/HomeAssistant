import { ClassicPrompt, ClassicDecisionActions } from './ClassicDecisionArt';
import { modeIncludes } from './mode-help';
import { useState } from 'react';
import { FACILITY_TYPES, buildingName, priceText } from './game/g4';
import type { Manifest } from './types';
import type { SessionSnapshot } from './game/session';
import { PROPERTY_CATALOG, paymentSplit, rentLines } from './game/economy';

const money = (amount: number) => amount.toLocaleString('zh-CN');
export function PropertyPanel({ snapshot, manifest, decide }: {
  snapshot: SessionSnapshot; manifest: Manifest; decide: (id: string, accept: boolean, buildingType?: number) => void;
}) {
  const [building, setBuilding] = useState<{ decisionId: string; value: number } | null>(null);
  const selectedType = building?.decisionId === snapshot.decision?.id ? building?.value : undefined;
  const economy = snapshot.economy;
  if (!economy) return null;
  const playerId = snapshot.decision?.payerId ?? `player-${snapshot.participants.indexOf(snapshot.active) + 1}`;
  const balance = economy.balances[playerId];
  const ownerName = (id: string | null) => id ? manifest.characters[snapshot.participants[Number(id.split('-')[1]) - 1]].name : '尚未购买';
  const decision = snapshot.decision;
  const definition = PROPERTY_CATALOG.properties.find((p) => p.id === snapshot.currentPropertyId);
  const property = economy.properties.find((p) => p.id === definition?.id);
  const payment = decision ? paymentSplit(balance, decision.amount, decision.operation === 'rent') : null;
  const owned = economy.properties.filter((p) => p.ownerId === playerId);
  const settled = snapshot.phase === 'turnEnd';
  return <section className="rm-property rm-classic-estate" aria-label="地产与资产">
    <div className="rm-section-title"><h2>{decision ? '地产决策' : '地产与资产'}</h2><span>物价 ×{modeIncludes(snapshot.mode, 'indexedEconomy')?snapshot.calendar?.business?.priceIndex??1:1}</span></div>
    {definition && property ? <>
      <ClassicPrompt><h3>{definition.name} · {definition.id.split(':')[2]}号{definition.kind === 'land' ? '地产' : '大型用地'}</h3>
      <p>{ownerName(property.ownerId)} · {snapshot.g4 ? `${buildingName(property, definition)} · ${property.level}级 · ${priceText(property)}` : property.level === 0 ? '空地' : `${property.level} 级建筑`}</p>
      {decision && <strong className="rm-native-price">{{ buy: '购买', upgrade: '建造升级', rent: '支付租金' }[decision.operation]} · {money(decision.amount)} 元</strong>}
      </ClassicPrompt>
      <p className="rm-property-note">关联路格：{definition.nodeIds.join('、')}{definition.kind === 'facility' && !snapshot.g4 ? ' · 专属建筑后续开放' : ''}</p>
      {decision ? <div className="rm-property-decision" role="group" aria-label="当前地产决策">
        <strong>{{ buy: '购买价格', upgrade: `升级至 ${property.level + 1} 级`, rent: `付给${ownerName(decision.recipientId)}的租金` }[decision.operation]}：{money(decision.amount)} 元</strong>
        <p>付款人：{ownerName(playerId)} · 现金 {money(balance.cash)} · 存款 {money(balance.bank)}</p>
        {decision.operation === 'rent' ? <>
          <details><summary>收费明细（{decision.lines.length} 项）</summary><ul>{decision.lines.map((line) => <li key={line.propertyId}>{line.propertyId.split(':')[2]}号 · {line.level}级：{money(line.amount)} 元</li>)}</ul></details>
          <p className="rm-property-note">先用现金，不足时补用存款；收入计入对方存款。</p>
          {payment ? <p>本次扣现金 {money(payment.cash)} / 存款 {money(payment.bank)}</p>
            : <p role="alert">资金不足，还差 {money(decision.amount - balance.cash - balance.bank)} 元。待付租金保留；债务处理尚未开放，请新建对局继续体验。</p>}
        </> : <p className="rm-property-note">仅使用现金。{!payment ? '现金不足，可放弃本次操作。' : '确认后扣款，可放弃。'}</p>}
        {decision.buildingChoices && <label className="rm-form-field">建造类型<select value={selectedType ?? ''} disabled={snapshot.paused} onChange={e => setBuilding(e.target.value === '' ? null : { decisionId: decision.id, value: Number(e.target.value) })}><option value="">请选择建筑</option>{decision.buildingChoices.map(t => <option key={t} value={t}>{FACILITY_TYPES[t]}</option>)}</select><small>研究所可在建成后选择产品，等级决定可研究的道具。</small></label>}
        {!!decision.hotelTurns && <p>住宿 {decision.hotelTurns} 次行动，免费卡不可免除住宿费；嫁祸后由付款者住宿。</p>}
        <ClassicDecisionActions accept={{ buy: '确认购买', upgrade: '确认升级', rent: '支付租金' }[decision.operation]}
          disabled={snapshot.paused || !payment || (!!decision.buildingChoices && selectedType === undefined)}
          onAccept={() => decision.buildingChoices ? decide(decision.id, true, selectedType) : decide(decision.id, true)}
          decline={decision.operation !== 'rent' ? '暂时放弃' : undefined} declineDisabled={snapshot.paused} onDecline={() => decide(decision.id, false)} />
      </div> : settled && property.ownerId === playerId && property.level === 5 ? <p>建筑已达 5 级，本回合无需升级。</p> : null}
    </> : <p className="rm-property-note">停在普通地产后可购买、升级或支付租金。</p>}
    <details className="rm-owned"><summary>当前角色的地产（{owned.length}）</summary>
      {owned.length ? <ul>{owned.map((p) => {
        const d = PROPERTY_CATALOG.properties.find((d) => d.id === p.id)!;
        const rent = rentLines(d, economy.properties, PROPERTY_CATALOG.properties).reduce((sum, line) => sum + line.amount, 0);
        return <li key={p.id}>{d.name} · {d.id.split(':')[2]}号 · {p.level}级<br /><small>{snapshot.g4 ? `${buildingName(p, d)} ${priceText(p)} · 收费按落点结算` : `落点基础租金 ${money(rent)} 元`}</small></li>;
      })}</ul> : <p>还没有地产。</p>}
    </details>
  </section>;
}
