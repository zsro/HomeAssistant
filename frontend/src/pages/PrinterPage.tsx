import { Link } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { AppHeader } from '../components/AppHeader';

export function PrinterPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <main className="app-shell">
      <AppHeader user={user} />
      <section className="module-page-main">
        <nav className="breadcrumbs" aria-label="面包屑">
          <Link to="/">首页</Link><span aria-hidden="true">/</span><span>打印机</span>
        </nav>
        <header className="module-page-heading">
          <span className="module-page-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M7 9V4h10v5M7 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M7 14h10v7H7z" /><path d="M17.5 12h.01" /></svg>
          </span>
          <div>
            <p className="eyebrow">PRINTER MODULE</p>
            <h1>打印机</h1>
            <p>在浏览器中生成适合 A4 纸打印的学习内容，无需上传或保存孩子的信息。</p>
          </div>
        </header>

        <section className="content-collection" aria-labelledby="kindergarten-heading">
          <div className="collection-heading">
            <div><p className="collection-kicker">学习内容</p><h2 id="kindergarten-heading">幼儿园</h2></div>
            <span>5-6 岁幼小衔接</span>
          </div>
          <div className="content-module-grid">
            <Link className="content-module-card" to="/modules/printer/kindergarten/math">
              <span className="content-module-icon" aria-hidden="true">1+2</span>
              <div><h3>数学</h3><p>随机生成六类数学练习，并可单独下载答案。</p></div>
              <span className="content-module-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </section>
      <footer className="app-footer">Home Assistant · 内容仅在你的浏览器中生成</footer>
    </main>
  );
}
