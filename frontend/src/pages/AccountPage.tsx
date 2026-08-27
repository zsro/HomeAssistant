import { useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { Logo } from '../components/Logo';

export function AccountPage() {
  const { user, signOut } = useAuth();
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(user.inviteCode);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
    window.setTimeout(() => setCopyStatus('idle'), 1_800);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
  };

  return (
    <main className="account-shell">
      <header className="account-nav">
        <Logo />
        <button className="text-button" type="button" onClick={handleSignOut} disabled={signingOut}>
          {signingOut ? '正在退出…' : '退出登录'}
        </button>
      </header>
      <section className="account-main">
        <div className="welcome-row">
          <div>
            <p className="eyebrow">YOUR PRIVATE SPACE</p>
            <h1>你好，{user.displayName}</h1>
            <p>你的账户已安全连接，可以从这里开始管理个人信息。</p>
          </div>
          <div className="avatar" aria-hidden="true">{user.displayName.slice(0, 1).toUpperCase()}</div>
        </div>

        <div className="account-grid">
          <article className="invite-card">
            <div className="card-heading">
              <span className="feature-icon" aria-hidden="true">✦</span>
              <div><p>我的邀请码</p><span>邀请一位你信任的人加入</span></div>
            </div>
            <button className="invite-code" type="button" onClick={copyInvite} aria-label="复制邀请码">
              <span>{user.inviteCode}</span>
              <small>{copyStatus === 'copied' ? '已复制' : copyStatus === 'failed' ? '复制失败，请手动记录' : '点击复制'}</small>
            </button>
            <p className="invite-note">邀请码可以长期使用，请仅分享给你信任的人。</p>
          </article>

          <article className="profile-card">
            <div className="card-heading">
              <span className="feature-icon outline" aria-hidden="true">○</span>
              <div><p>账户信息</p><span>你的基本个人资料</span></div>
            </div>
            <dl>
              <div><dt>用户名</dt><dd>@{user.username}</dd></div>
              <div><dt>账户状态</dt><dd><span className="status-dot" />正常</dd></div>
              <div><dt>加入时间</dt><dd>{new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long' }).format(new Date(user.createdAt))}</dd></div>
            </dl>
          </article>
        </div>
      </section>
      <footer className="account-footer">Home Assistant · 安全连接你的生活</footer>
    </main>
  );
}
