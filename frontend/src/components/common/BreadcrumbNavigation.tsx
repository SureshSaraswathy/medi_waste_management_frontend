import { useNavigate } from 'react-router-dom';

export type BreadcrumbItem = {
  label: string;
  path?: string;
  onClick?: () => void;
  isCurrent?: boolean;
};

interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[];
  className?: string;
}

const BreadcrumbNavigation = ({ items, className = '' }: BreadcrumbNavigationProps) => {
  const navigate = useNavigate();

  return (
    <nav className={`app-breadcrumb ${className}`.trim()} aria-label="Breadcrumb">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const isCurrent = item.isCurrent ?? isLast;
        const isClickable = !isCurrent && (!!item.onClick || !!item.path);

        const handleClick = () => {
          if (item.onClick) {
            item.onClick();
            return;
          }
          if (item.path) {
            navigate(item.path);
          }
        };

        return (
          <span key={`${item.label}-${idx}`} className="app-breadcrumb__item">
            <span
              className={
                isCurrent
                  ? 'app-breadcrumb__current'
                  : isClickable
                    ? 'app-breadcrumb__link'
                    : 'app-breadcrumb__text'
              }
              onClick={isClickable ? handleClick : undefined}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={(e) => {
                if (!isClickable) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClick();
                }
              }}
            >
              {item.label}
            </span>
            {!isLast && <span className="app-breadcrumb__separator">/</span>}
          </span>
        );
      })}
    </nav>
  );
};

export default BreadcrumbNavigation;
