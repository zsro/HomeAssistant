type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  kind?: 'user' | 'name' | 'invite';
};

export function TextField({ id, label, value, onChange, error, placeholder, autoComplete, maxLength, kind = 'user' }: TextFieldProps) {
  const icon = kind === 'invite'
    ? <path d="M4 9h16v11H4zM12 9v11M3 9h18M8 9C5 8.4 5.3 4 8 4c2.5 0 4 5 4 5s1.5-5 4-5c2.7 0 3 4.4 0 5" />
    : kind === 'name'
      ? <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 21a7.5 7.5 0 0 1 15 0" />
      : <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 21a7.5 7.5 0 0 1 15 0" />;

  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <div className={`input-wrap ${error ? 'has-error' : ''}`}>
        <svg className="input-icon" viewBox="0 0 24 24" aria-hidden="true">{icon}</svg>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>
      {error && <p className="field-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}
