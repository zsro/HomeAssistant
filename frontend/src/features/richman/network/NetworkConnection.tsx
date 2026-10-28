import { useState } from 'react';
import { useAuth } from '../../../auth/auth-context';
import { getErrorMessage } from '../../../api/client';
import type { NetworkSession } from './session';
import type { SessionSnapshot } from '../game/session';
export function NetworkConnection({ model, snapshot, initialError, onReconnect }: { model: NetworkSession | null; snapshot: SessionSnapshot | null; initialError?: string; onReconnect?: () => void }) {
  const auth = useAuth(), [username, setUsername] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState('');
  const network = snapshot?.network;
  return <div className="rm-cloud-status rm-network-status" aria-label="联机状态">
    <span role="status">{initialError || network?.message || snapshot?.message || '正在连接对局…'} · 服务器持续保存</span>
    {network?.pending && <button disabled={network.sending || network.readOnly} onClick={() => void model?.retryPending()}>重试原请求</button>}
    {network?.readOnly && <button onClick={() => void model?.reclaim()}>在此窗口接管</button>}
    {network && !network.connected && <button onClick={() => void model?.refresh()}>重新连接</button>}
    {(auth.status !== 'authenticated' || initialError || network && !network.connected) && <details><summary>重新登录原账号</summary><form onSubmit={e => {
      e.preventDefault(); void auth.signIn({ username, password }).then(() => { setPassword(''); setError(''); return model ? model.refresh() : onReconnect?.(); }).catch(e => setError(getErrorMessage(e)));
    }}><label>用户名<input value={username} autoComplete="username" onChange={e => setUsername(e.target.value)} /></label><label>密码<input type="password" value={password} autoComplete="current-password" onChange={e => setPassword(e.target.value)} /></label><button>登录并重连</button>{error && <p role="alert">{error}</p>}</form></details>}
  </div>;
}
