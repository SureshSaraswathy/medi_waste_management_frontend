/**
 * RowSection Component
 * 
 * Wraps dashboard rows to provide visual grouping and layering.
 * Controls spacing and grouping at the row level, not individual cards.
 * 
 * This component ensures that any dynamically configured dashboard rows
 * automatically get the proper visual layering without hardcoding.
 * Grid layout adapts automatically based on widget count.
 */

import React, { useMemo } from 'react';
import './RowSection.css';

interface RowSectionProps {
  children: React.ReactNode;
  className?: string;
}

export const RowSection: React.FC<RowSectionProps> = ({ children, className = '' }) => {
  // Count children for grid layout optimization
  const childCount = useMemo(() => {
    if (Array.isArray(children)) {
      return children.filter(child => child !== null && child !== undefined).length;
    }
    return children ? 1 : 0;
  }, [children]);

  return (
    <section 
      className={`dashboard-row section-row row-section dashboard-grid ${className}`.trim()}
      data-widget-count={childCount}
    >
      {children}
    </section>
  );
};

export default RowSection;
