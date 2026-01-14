import { ButtonHTMLAttributes } from 'react';
import './primaryButton.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

const PrimaryButton = ({ loading, children, ...rest }: Props) => (
  <button className="primary-btn" disabled={loading || rest.disabled} {...rest}>
    {loading ? 'Working...' : children}
  </button>
);

export default PrimaryButton;
