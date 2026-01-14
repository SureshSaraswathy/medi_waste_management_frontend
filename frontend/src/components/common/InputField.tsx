import { InputHTMLAttributes, useState } from 'react';
import './inputField.css';

type Props = {
  label: string;
  error?: string;
  hint?: string;
} & InputHTMLAttributes<HTMLInputElement>;

const InputField = ({ label, type = 'text', error, hint, ...rest }: Props) => {
  const [isSecretVisible, setSecretVisible] = useState(false);
  const isPassword = type === 'password';
  const computedType = isPassword && isSecretVisible ? 'text' : type;

  return (
    <label className={`input-field ${error ? 'input-field--error' : ''}`}>
      <span>{label}</span>
      <div className="input-field__control">
        <input type={computedType} {...rest} />
        {isPassword && (
          <button
            type="button"
            className="input-field__toggle"
            onClick={() => setSecretVisible((v) => !v)}
            aria-label={isSecretVisible ? 'Hide password' : 'Show password'}
          >
            {isSecretVisible ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {error ? <small className="input-field__error">{error}</small> : hint && <small>{hint}</small>}
    </label>
  );
};

export default InputField;
