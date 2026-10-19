import type { Manifest } from './types';
import type { SessionOptions } from './game/session';
import type { ComputerPolicy } from './game/computer';
import { INITIAL_FUNDS } from './game/economy';
import { SETUP_MODES, COMPUTER_POLICIES, hasCalendar, hasComputer, hasFunds } from './setup-options';

export type SetupDraft = { mode: SessionOptions['mode']; ids: string[]; computers: string[]; policy: ComputerPolicy; funds: number; date: string; seed: string };
export function ClassicSetupForm({ manifest, draft: d, onChange, error, onSubmit, onCancel }: {
  manifest: Manifest | null; draft: SetupDraft; onChange: (patch: Partial<SetupDraft>) => void; error: string; onSubmit: () => void; onCancel: () => void;
}) {
  return <form className="rm-classic-setup" onSubmit={e => { e.preventDefault(); onSubmit(); }}>
    <p>选择同行角色与资金。开始后会替换当前进度；取消可返回原对局。</p>
    <fieldset disabled={d.mode === 'sandbox'}><legend>参与角色（至少两位）</legend><div className="rm-setup-roster">
      {manifest?.characters.map(c => <label className="rm-setup-character" key={c.id}>
        <input type="checkbox" checked={d.ids.includes(c.id)} onChange={e => onChange({ ids: e.target.checked ? [...d.ids,c.id] : d.ids.filter(id => id !== c.id) })} />
        <img src={`/richman/generated/${c.id}.webp`} alt="" /><span>{c.name}</span>
      </label>)}
      <div className="rm-setup-unavailable">其他原版角色<small>暂未接入</small></div>
    </div></fieldset>
    {hasComputer(d.mode) && <fieldset className="rm-setup-controls"><legend>座位控制</legend>{manifest?.characters.filter(c => d.ids.includes(c.id)).map(c => <label key={c.id}>{c.name}<select aria-label={`${c.name}控制方式`} value={d.computers.includes(c.id) ? 'computer' : 'human'} onChange={e => onChange({computers: e.target.value === 'computer' ? [...new Set([...d.computers,c.id])] : d.computers.filter(id => id !== c.id)})}><option value="human">人类</option><option value="computer">电脑</option></select></label>)}</fieldset>}
    {hasFunds(d.mode) && <label className="rm-form-field">每人初始资金<select aria-label="每人初始资金" value={d.funds} onChange={e => onChange({funds:Number(e.target.value)})}>{INITIAL_FUNDS.map(n => <option key={n} value={n}>{n.toLocaleString()} 元</option>)}</select><small>现金与存款各半；实际经营规则随所选模式保留。</small></label>}
    {hasCalendar(d.mode) && <label className="rm-form-field">开局日期<input type="date" min="1998-01-01" max="2099-12-31" value={d.date} onChange={e => onChange({date:e.target.value})} /></label>}
    <details className="rm-setup-advanced"><summary>高级设置 · 历史模式、电脑策略与种子</summary>
      <label className="rm-form-field">游戏模式<select aria-label="游戏模式" value={d.mode} onChange={e => onChange({mode:e.target.value as SetupDraft['mode']})}>{SETUP_MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
      {hasComputer(d.mode) && <label className="rm-form-field">电脑策略<select aria-label="电脑策略" value={d.policy} onChange={e => onChange({policy:e.target.value as ComputerPolicy})}>{COMPUTER_POLICIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>}
      {d.mode !== 'sandbox' && <label className="rm-form-field">对局种子（可选）<input value={d.seed} maxLength={64} onChange={e => onChange({seed:e.target.value})} placeholder="留空自动生成" /><small>相同配置、种子和选择可重现对局。</small></label>}
      <p>历史模式保留当时的能力；验证模式用于检查地图。原版存读档尚未接入，回放下载是独立功能。</p>
    </details>
    {error && <p role="alert">{error}</p>}
    <div className="rm-setup-actions"><button type="button" className="rm-button rm-button-light" onClick={onCancel}>取消</button><button type="submit" className="rm-button">开始新对局</button></div>
  </form>;
}
