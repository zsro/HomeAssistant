import { useState } from 'react';
import { useAuth } from '../../auth/auth-context';
import { getErrorMessage } from '../../api/client';
import { ClassicPrompt } from './ClassicDecisionArt';
import { SAVE_SLOTS, slotName } from './cloud-api';
import type { SaveReceipt, SlotKey } from './cloud-api';
import type { CloudSaves, CloudSaveState } from './cloud-saves';
import type { Manifest } from './types';

export function SaveSummary({ receipt, manifest }: { receipt: SaveReceipt; manifest: Manifest | null }) {
  const summary = receipt.summary;
  return <dl className="rm-save-summary">
    <div><dt>旅程</dt><dd>日本 · {summary.gameDate ?? '—'} · 第 {summary.turn} 回合</dd></div>
    <div><dt>角色</dt><dd>{summary.characterIds.map(id =>
      `${manifest?.characters.find(c => c.id === id)?.name ?? id}${summary.computerIds.includes(id) ? '（电脑）' : ''}`).join('、')}</dd></div>
    <div><dt>保存时间</dt><dd>{new Date(receipt.savedAt).toLocaleString()}</dd></div>
    <div><dt>进度</dt><dd>第 {summary.revision} 步 · 槽位版本 {receipt.slotVersion}{summary.paused ? ' · 已暂停' : ''}</dd></div>
  </dl>;
}

export function CloudSavePanel({ mode, manager, state, manifest, onWaiting, onAdopt, exitAfterSave }: {
  mode: 'save' | 'load'; manager: CloudSaves; state: CloudSaveState; manifest: Manifest | null;
  onWaiting: () => void; onAdopt: () => void; exitAfterSave: boolean;
}) {
  const auth = useAuth();
  const [confirmation, setConfirmation] = useState<{ slot: SlotKey; version: number } | null>(null);
  const [username, setUsername] = useState(auth.user?.username ?? '');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(''), [signingIn, setSigningIn] = useState(false);
  const locked = state.busy || state.waiting || state.pending || state.listing || state.slots === null;
  const write = async (slot: SlotKey, version: number) => {
    setConfirmation(null);
    await manager.save(slot, version);
    if (manager.snapshot().waiting) onWaiting();
  };
  const select = (slot: SlotKey) => {
    const receipt = state.slots?.find(item => item.slot === slot);
    if (mode === 'load') { void manager.load(slot); return; }
    if (receipt) setConfirmation({ slot, version: receipt.slotVersion });
    else void write(slot, 0);
  };
  return <section className="rm-cloud-saves" aria-label={mode === 'save' ? '云端存档槽位' : '云端读档槽位'}>
    <p>{exitAfterSave ? '保存成功后返回模块集合；失败会留在当前对局。' :
      mode === 'save' ? '当前完整对局可保存到本人云端。请选择手动槽位。' : '先读取并校验存档，再确认是否替换当前对局。'}</p>
    <label className="rm-save-auto"><input type="checkbox" checked={state.automatic} onChange={event => manager.setAutomatic(event.target.checked)} />
      自动保存（稳定操作点，最多每 30 秒一次）</label>
    <p className="rm-property-note">新建或读取另一局后，自动档会随该局更新；需要长期保留的旅程请存入手动槽。</p>
    {state.message && <p className={state.errorCode ? 'rm-save-error' : 'rm-save-status'} role={state.errorCode ? 'alert' : 'status'}>{state.message}</p>}
    {(state.errorCode === 'ACCESS_TOKEN_INVALID' || state.errorCode === 'SAVE_ACCOUNT_CHANGED' || auth.status === 'anonymous') &&
      <form className="rm-save-login" aria-label="重新登录并保留对局" onSubmit={event => {
        event.preventDefault(); setSigningIn(true); setLoginError('');
        void auth.signIn({ username, password }).then(() => manager.refresh())
          .catch(error => setLoginError(getErrorMessage(error))).finally(() => { setPassword(''); setSigningIn(false); });
      }}>
        <p>请登录开始这局时使用的账号。登录成功后，可点击“重试这次保存”。</p>
        <label>账号<input autoComplete="username" value={username} required onChange={event => setUsername(event.target.value)} /></label>
        <label>密码<input type="password" autoComplete="current-password" value={password} required onChange={event => setPassword(event.target.value)} /></label>
        {loginError && <p role="alert">{loginError}</p>}
        <button className="rm-button" disabled={signingIn}>{signingIn ? '正在登录…' : '重新登录'}</button>
      </form>}
    {state.restoring && <div className="rm-save-restoring"><progress max={100} value={state.progress} aria-label="恢复进度" /><span>{state.progress}%</span>
      <button className="rm-button rm-button-light" onClick={() => manager.cancelLoad()}>取消读取，保留当前对局</button></div>}
    {state.pending && !state.busy && <div className="rm-save-actions">
      <button className="rm-button" disabled={state.errorCode === 'SAVE_VERSION_CONFLICT' || state.errorCode === 'SAVE_REQUEST_REUSED'} onClick={() => void manager.retry()}>重试这次保存</button>
      <button className="rm-button rm-button-light" onClick={() => { manager.abandon(); void manager.refresh(); }}>放弃这次请求，重新读取槽位</button>
    </div>}
    {state.candidate && state.candidateReceipt ? <div className="rm-save-confirm">
      <ClassicPrompt><h3>替换当前对局？</h3><p>存档已恢复校验。当前未保存进度将丢失；恢复后仍需点击继续。</p></ClassicPrompt>
      <SaveSummary receipt={state.candidateReceipt} manifest={manifest} />
      <div className="rm-save-actions"><button className="rm-button" onClick={onAdopt}>确认替换当前对局</button>
        <button className="rm-button rm-button-light" onClick={() => manager.cancelLoad()}>保留当前对局</button></div>
    </div> : <>
      <div className="rm-save-actions"><button className="rm-button rm-button-light" disabled={state.busy || state.listing} onClick={() => void manager.refresh()}>
        {state.listing ? '正在读取槽位…' : '重新读取槽位'}</button></div>
      {state.slots?.length === 0 && <p>暂无云端存档。开始新局后可在这里保存。</p>}
      <div className="rm-save-slots">{SAVE_SLOTS.map(slot => {
        const receipt = state.slots?.find(item => item.slot === slot);
        return <article key={slot} className="rm-save-slot" aria-label={slotName(slot)}>
          <h3>{slotName(slot)}</h3>
          {receipt ? <SaveSummary receipt={receipt} manifest={manifest} /> : <p>{state.slots === null ? '等待读取槽位' : '空槽位'}</p>}
          {mode === 'save' && slot === 'auto' ? <p className="rm-property-note">由自动保存更新；手动保存请选择上方槽位。</p> :
            <button className="rm-button" disabled={locked || (mode === 'load' && !receipt)} onClick={() => select(slot)}>
              {mode === 'load' ? `读取${slotName(slot)}` : `保存到${slotName(slot)}`}</button>}
        </article>;
      })}</div>
    </>}
    {confirmation && <div className="rm-save-confirm" role="alert">
      <ClassicPrompt><h3>覆盖{slotName(confirmation.slot)}？</h3><p>将用当前进度更新此槽位。旧版本仍保留在服务端，读档列表会显示本次保存。</p></ClassicPrompt>
      <div className="rm-save-actions"><button className="rm-button" disabled={locked} onClick={() => void write(confirmation.slot, confirmation.version)}>确认覆盖</button>
        <button className="rm-button rm-button-light" onClick={() => setConfirmation(null)}>取消覆盖</button></div>
    </div>}
  </section>;
}
