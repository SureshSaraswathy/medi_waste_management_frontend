import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import './reportExportDropdown.css';

type ExportFormat = 'pdf' | 'excel' | 'csv';

interface ReportExportDropdownProps {
  disabled?: boolean;
  onExport: (format: ExportFormat) => void;
}

const ReportExportDropdown = ({ disabled = false, onExport }: ReportExportDropdownProps) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updateMenuPosition = () => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const menuWidth = 152;
    const menuHeight = 126;
    const gap = 6;

    let left = rect.right - menuWidth;
    let top = rect.bottom + gap;

    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;

    // If not enough space below, open upward.
    if (top + menuHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - menuHeight - gap);
    }

    setMenuPosition({ top, left });
  };

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideTrigger = !!wrapperRef.current?.contains(target);
      const clickedInsideMenu = !!menuRef.current?.contains(target);
      if (!clickedInsideTrigger && !clickedInsideMenu) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const onWindowChange = () => updateMenuPosition();
    window.addEventListener('resize', onWindowChange);
    window.addEventListener('scroll', onWindowChange, true);
    return () => {
      window.removeEventListener('resize', onWindowChange);
      window.removeEventListener('scroll', onWindowChange, true);
    };
  }, [open]);

  const handleSelect = (format: ExportFormat) => {
    onExport(format);
    setOpen(false);
  };

  return (
    <div className="report-export-dropdown" ref={wrapperRef}>
      <button
        type="button"
        className={`report-export-trigger ${open ? 'active' : ''}`}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) updateMenuPosition();
        }}
        disabled={disabled}
        title="Export"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Export
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dropdown-arrow">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {open &&
        createPortal(
        <div
          ref={menuRef}
          className="report-export-menu"
          style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
        >
          <button type="button" className="report-export-option" onClick={() => handleSelect('pdf')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            PDF
          </button>
          <button type="button" className="report-export-option" onClick={() => handleSelect('excel')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            Excel
          </button>
          <button type="button" className="report-export-option" onClick={() => handleSelect('csv')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            CSV
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ReportExportDropdown;

