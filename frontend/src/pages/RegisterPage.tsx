import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../auth/auth-context';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordField } from '../components/PasswordField';
import { TextField } from '../components/TextField';

type FieldErrors = Partial<Record<'displayName' | 'username' | 'password' | 'inviteCode', string>>;

function validate(values: { displayName: string; username: string; password: string; inviteCode: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (values.displayName.trim().length < 1) errors.displayName = '请输入显示名称';
  else if (values.displayName.trim().length > 64) errors.displayName = '显示名称最多 64 位';
  if (!/^[a-z0-9_]{3,32}$/.test(values.username.trim().toLowerCase())) errors.username = '使用 3–32 位小写字母、数字或下划线';
  if (values.password.length < 10) errors.password = '密码至少需要 10 位';
  else if (values.password.length > 128) errors.password = '密码最多 128 位';
  if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/.test(values.inviteCode.trim().toUpperCase())) errors.inviteCode = '请输入 10 位有效邀请码';
  return errors;
}

export function RegisterPage() {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [requestError, setRequestError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const values = {
      displayName: displayName.trim(),
      username: username.trim().toLowerCase(),
      password,
      inviteCode: inviteCode.trim().toUpperCase(),
    };
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setRequestError('');
    setSubmitting(true);
    try {
      await signUp(values);
    } catch (error) {
      setRequestError(getErrorMessage(error));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <header className="auth-heading compact">
        <p className="eyebrow">JOIN THE SPACE</p>
        <h2>创建你的账户</h2>
        <p>填写信息并使用受信任用户的邀请码加入</p>
      </header>
      <div className="auth-tabs" aria-label="账户操作">
        <Link to="/login">登录</Link>
        <span className="active">注册</span>
      </div>
      <form onSubmit={submit} noValidate>
        <TextField id="register-name" label="显示名称" value={displayName} onChange={setDisplayName} error={errors.displayName} autoComplete="name" placeholder="大家如何称呼你" maxLength={64} kind="name" />
        <TextField id="register-username" label="用户名" value={username} onChange={(value) => setUsername(value.toLowerCase())} error={errors.username} autoComplete="username" placeholder="3–32 位字母、数字或下划线" maxLength={32} />
        <PasswordField id="register-password" label="密码" value={password} onChange={setPassword} error={errors.password} autoComplete="new-password" hint="至少 10 位" />
        <TextField id="register-invite" label="邀请码" value={inviteCode} onChange={(value) => setInviteCode(value.toUpperCase().replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, ''))} error={errors.inviteCode} autoComplete="off" placeholder="10 位邀请码" maxLength={10} kind="invite" />
        {requestError && <div className="form-alert" role="alert"><span>!</span>{requestError}</div>}
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? <><span className="button-spinner" />正在创建</> : <>创建账户 <span aria-hidden="true">→</span></>}
        </button>
      </form>
      <p className="switch-copy">已经有账户？<Link to="/login">返回登录</Link></p>
    </AuthLayout>
  );
}
