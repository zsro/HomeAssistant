import { useState } from 'react';

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete: string;
  hint?: string;
};

export function PasswordField({ id, label, value, onChange, error, autoComplete, hint }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field-group">
      <div className="field-label-row">
        <label htmlFor={id}>{label}</label>
        {hint && <span className="field-hint">{hint}</span>}
      </div>
      <div className={`input-wrap ${error ? 'has-error' : ''}`}>
        <svg className="input-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6zM12 14v2" /></svg>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button className="visibility-button" type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? '隐藏密码' : '显示密码'}>
          {visible ? '隐藏' : '显示'}
        </button>
      </div>
      {error && <p className="field-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}
