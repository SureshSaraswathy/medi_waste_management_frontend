import { Link } from 'react-router-dom';

export interface ReportCardProps {
  id: string;
  title: string;
  description: string;
  icon: JSX.Element;
  path: string;
  parameters: string[];
  indicators?: ('popular' | 'scheduled' | 'restricted' | 'beta')[];
}

const ReportCard = ({
  id,
  title,
  description,
  icon,
  path,
  parameters,
  indicators = [],
}: ReportCardProps) => {
  // Format parameters for display (one line, truncated)
  const formatParameters = () => {
    if (parameters.length === 0) return 'No parameters';
    
    const maxVisible = 3;
    const visibleParams = parameters.slice(0, maxVisible);
    const remainingCount = parameters.length - maxVisible;
    
    let paramsText = visibleParams.join(' · ');
    if (remainingCount > 0) {
      paramsText += ` +${remainingCount} more`;
    }
    
    return paramsText;
  };

  return (
    <Link
      to={path}
      className="report-card-modern"
      aria-label={`View ${title} report`}
    >
      {/* Card Header */}
      <div className="report-card-modern-header">
        <div className="report-card-modern-icon">{icon}</div>
        <div className="report-card-modern-title-section">
          <h3 className="report-card-modern-title">{title}</h3>
          {indicators.length > 0 && (
            <div className="report-card-modern-indicators">
              {indicators.includes('popular') && (
                <span className="indicator-icon" title="Frequently used">⭐</span>
              )}
              {indicators.includes('scheduled') && (
                <span className="indicator-icon" title="Scheduled">🕒</span>
              )}
              {indicators.includes('restricted') && (
                <span className="indicator-icon" title="Restricted">🔒</span>
              )}
              {indicators.includes('beta') && (
                <span className="indicator-icon" title="Beta">🧪</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="report-card-modern-body">
        {/* Description */}
        <p className="report-card-modern-description">{description}</p>

        {/* Parameters Line */}
        <div className="report-card-modern-parameters">
          <span className="parameters-label">Params:</span>
          <span className="parameters-value">{formatParameters()}</span>
        </div>
      </div>
    </Link>
  );
};

export default ReportCard;
