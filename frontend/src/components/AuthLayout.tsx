import { Logo } from './Logo';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <section className="brand-panel">
        <Logo />
        <div className="brand-copy">
          <p className="eyebrow">PRIVATE BY DESIGN</p>
          <h1>让每一次连接，<br />都从信任开始。</h1>
          <p>一个安静、安全的家庭智能中心。通过可信用户的邀请，加入属于你的空间。</p>
        </div>
        <div className="brand-note">
          <span className="brand-note-icon" aria-hidden="true">✦</span>
          <span>邀请码机制保护每一个账户</span>
        </div>
        <div className="orb orb-one" />
        <div className="orb orb-two" />
      </section>
      <section className="auth-panel">
        <div className="mobile-brand"><Logo /></div>
        <div className="auth-card">{children}</div>
        <p className="auth-footer">安全连接 · 私密空间 · 值得信任</p>
      </section>
    </main>
  );
}
