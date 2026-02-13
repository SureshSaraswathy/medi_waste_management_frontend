import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import '../../pages/desktop/dashboardPage.css';
import './reportDesignPage.css';

interface ReportParameter {
  name: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'daterange' | 'number' | 'multiselect';
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  min?: number;
  max?: number;
}

interface ReportDesignPageProps {
  reportTitle: string;
  reportDescription: string;
  parameters: ReportParameter[];
  onGenerate: (params: Record<string, any>) => void;
  defaultParams?: Record<string, any>;
}

const ReportDesignPage = ({
  reportTitle,
  reportDescription,
  parameters,
  onGenerate,
  defaultParams = {},
}: ReportDesignPageProps) => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Record<string, any>>(defaultParams);
  const [generating, setGenerating] = useState(false);

  const handleFieldChange = (name: string, value: any) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleDateRangeChange = (name: string, type: 'from' | 'to', value: string) => {
    const dateRange = formData[name] || {};
    setFormData({ ...formData, [name]: { ...dateRange, [type]: value } });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      await onGenerate(formData);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all parameters?')) {
      setFormData(defaultParams);
    }
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    // This would call the generate function with export format
    onGenerate({ ...formData, exportFormat: format });
  };

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </div>
          <span className="brand-name">MEDI-WASTE</span>
        </div>
        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`nav-link ${item.active ? 'nav-link--active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-notification-btn" aria-label="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span className="notification-badge">3</span>
          </button>
          <button onClick={logout} className="sidebar-logout-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-left">
            <button 
              className="back-button"
              onClick={() => navigate('/report')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5"></path>
                <path d="M12 19l-7-7 7-7"></path>
              </svg>
              Back to Reports
            </button>
            <span className="breadcrumb">/ Reports / {reportTitle}</span>
          </div>
        </header>

        <div className="report-design-page">
          <div className="report-design-header">
            <div>
              <h1 className="report-design-title">{reportTitle}</h1>
              <p className="report-design-description">{reportDescription}</p>
            </div>
          </div>

          <form className="report-design-form" onSubmit={handleSubmit}>
            <div className="report-parameters-section">
              <h2 className="parameters-section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                Report Parameters
              </h2>
              
              <div className="parameters-grid">
                {parameters.map((param) => (
                  <div key={param.name} className={`parameter-group ${param.type === 'daterange' ? 'parameter-group--full' : ''}`}>
                    <label className="parameter-label">
                      {param.label}
                      {param.required && <span className="required-asterisk">*</span>}
                    </label>
                    
                    {param.type === 'text' && (
                      <input
                        type="text"
                        className="parameter-input"
                        value={formData[param.name] || ''}
                        onChange={(e) => handleFieldChange(param.name, e.target.value)}
                        placeholder={param.placeholder || `Enter ${param.label.toLowerCase()}`}
                        required={param.required}
                      />
                    )}

                    {param.type === 'select' && (
                      <select
                        className="parameter-select"
                        value={formData[param.name] || ''}
                        onChange={(e) => handleFieldChange(param.name, e.target.value)}
                        required={param.required}
                      >
                        <option value="">Select {param.label}</option>
                        {param.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {param.type === 'multiselect' && (
                      <select
                        className="parameter-select parameter-select--multi"
                        multiple
                        value={formData[param.name] || []}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, option => option.value);
                          handleFieldChange(param.name, selected);
                        }}
                        required={param.required}
                      >
                        {param.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {param.type === 'date' && (
                      <input
                        type="date"
                        className="parameter-input"
                        value={formData[param.name] || ''}
                        onChange={(e) => handleFieldChange(param.name, e.target.value)}
                        required={param.required}
                      />
                    )}

                    {param.type === 'daterange' && (
                      <div className="date-range-input">
                        <div className="date-range-item">
                          <label>From Date</label>
                          <input
                            type="date"
                            className="parameter-input"
                            value={formData[param.name]?.from || ''}
                            onChange={(e) => handleDateRangeChange(param.name, 'from', e.target.value)}
                            required={param.required}
                          />
                        </div>
                        <div className="date-range-item">
                          <label>To Date</label>
                          <input
                            type="date"
                            className="parameter-input"
                            value={formData[param.name]?.to || ''}
                            onChange={(e) => handleDateRangeChange(param.name, 'to', e.target.value)}
                            required={param.required}
                          />
                        </div>
                      </div>
                    )}

                    {param.type === 'number' && (
                      <input
                        type="number"
                        className="parameter-input"
                        value={formData[param.name] || ''}
                        onChange={(e) => handleFieldChange(param.name, e.target.value)}
                        placeholder={param.placeholder}
                        min={param.min}
                        max={param.max}
                        required={param.required}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="report-actions">
              <button type="button" className="btn btn--secondary" onClick={handleReset}>
                Reset
              </button>
              <button type="submit" className="btn btn--primary" disabled={generating}>
                {generating ? 'Generating...' : 'Generate Report'}
              </button>
              <div className="export-buttons">
                <button 
                  type="button" 
                  className="btn btn--export btn--pdf"
                  onClick={() => handleExport('pdf')}
                  disabled={generating}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Export PDF
                </button>
                <button 
                  type="button" 
                  className="btn btn--export btn--excel"
                  onClick={() => handleExport('excel')}
                  disabled={generating}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Export Excel
                </button>
              </div>
            </div>
          </form>

          {/* Report Preview/Results Section - Will be shown after generation */}
          {formData._reportGenerated && (
            <div className="report-results">
              <h3 className="results-title">Report Results</h3>
              <div className="results-info">
                <p>Report generated successfully. Total records: {formData._recordCount || 0}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReportDesignPage;
