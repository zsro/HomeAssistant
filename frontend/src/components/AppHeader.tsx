import { Link } from 'react-router-dom';
import type { User } from '../auth/types';
import { Logo } from './Logo';

export function AppHeader({ user }: { user: User }) {
  return (
    <header className="app-nav">
      <Link className="nav-logo" to="/" aria-label="返回首页">
        <Logo />
      </Link>
      <Link className="user-entry" to="/account" aria-label={`进入${user.displayName}的用户页面`}>
        <span className="user-entry-avatar" aria-hidden="true">
          {user.displayName.slice(0, 1).toUpperCase()}
        </span>
        <span className="user-entry-copy">
          <small>用户页面</small>
          <strong>{user.displayName}</strong>
        </span>
        <span className="user-entry-arrow" aria-hidden="true">→</span>
      </Link>
    </header>
  );
}
