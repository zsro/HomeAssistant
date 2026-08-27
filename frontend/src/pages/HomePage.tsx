import { Link } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { AppHeader } from '../components/AppHeader';

export function HomePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <main className="app-shell">
      <AppHeader user={user} />
      <section className="home-main">
        <div className="home-hero">
          <div className="home-hero-copy">
            <p className="eyebrow">HOME OVERVIEW</p>
            <h1>欢迎回家，{user.displayName}</h1>
            <p>你的家庭空间已安全连接。这里将成为管理设备、场景与家庭成员的起点。</p>
            <div className="connection-status">
              <span className="status-dot" />
              空间连接正常
            </div>
          </div>
          <div className="home-illustration" aria-hidden="true">
            <div className="home-orbit home-orbit-one" />
            <div className="home-orbit home-orbit-two" />
            <svg viewBox="0 0 180 180" role="img">
              <path d="M41 84 90 40l49 44v52a8 8 0 0 1-8 8H49a8 8 0 0 1-8-8Z" />
              <path d="M72 144v-39h36v39M62 81l28-25 28 25" />
              <path className="home-illustration-spark" d="M133 45v13M126.5 51.5h13M44 44v9M39.5 48.5h9" />
            </svg>
          </div>
        </div>

        <section className="module-collection" aria-labelledby="module-collection-heading">
          <div className="module-collection-heading"><div><p className="home-card-kicker">MODULE COLLECTION</p><h2 id="module-collection-heading">模块集合</h2></div><span>1 个可用模块</span></div>
          <Link className="module-entry-card" to="/modules/printer">
            <span className="module-entry-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 9V4h10v5M7 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M7 14h10v7H7z" /><path d="M17.5 12h.01" /></svg></span>
            <span className="module-entry-copy"><small>学习内容输出</small><strong>打印机</strong><span>生成适合 A4 纸打印的学习 PDF</span></span>
            <span className="module-entry-arrow" aria-hidden="true">→</span>
          </Link>
        </section>
      </section>
      <footer className="app-footer">Home Assistant · 安全连接你的生活</footer>
    </main>
  );
}
