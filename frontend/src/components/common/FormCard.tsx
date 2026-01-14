import { PropsWithChildren, ReactNode } from 'react';
import './formCard.css';

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  action?: ReactNode;
}>;

const FormCard = ({ title, subtitle, action, children }: Props) => (
  <section className="form-card">
    <div className="form-card__header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && <div className="form-card__action">{action}</div>}
    </div>
    <div className="form-card__body">{children}</div>
  </section>
);

export default FormCard;
