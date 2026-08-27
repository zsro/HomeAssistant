import { Logo } from './Logo';

export function LoadingScreen() {
  return (
    <main className="loading-screen" aria-live="polite">
      <Logo />
      <span className="loader" aria-hidden="true" />
      <p>正在确认登录状态…</p>
    </main>
  );
}
