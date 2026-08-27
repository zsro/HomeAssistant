import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../auth/auth-context';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordField } from '../components/PasswordField';
import { TextField } from '../components/TextField';

export function LoginPage() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername || !password) {
      setError('请输入用户名和密码');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await signIn({ username: normalizedUsername, password });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <header className="auth-heading">
        <p className="eyebrow">WELCOME BACK</p>
        <h2>欢迎回来</h2>
        <p>登录后继续管理你的智能空间</p>
      </header>
      <div className="auth-tabs" aria-label="账户操作">
        <span className="active">登录</span>
        <Link to="/register">注册</Link>
      </div>
      <form onSubmit={submit} noValidate>
        <TextField id="login-username" label="用户名" value={username} onChange={(value) => setUsername(value.toLowerCase())} autoComplete="username" placeholder="输入你的用户名" maxLength={32} />
        <PasswordField id="login-password" label="密码" value={password} onChange={setPassword} autoComplete="current-password" />
        {error && <div className="form-alert" role="alert"><span>!</span>{error}</div>}
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? <><span className="button-spinner" />正在登录</> : <>进入我的空间 <span aria-hidden="true">→</span></>}
        </button>
      </form>
      <p className="switch-copy">还没有账户？<Link to="/register">使用邀请码注册</Link></p>
    </AuthLayout>
  );
}
