import React from 'react';
import './formLayout.css';

interface FormLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * FormLayout component provides a consistent 2-column responsive grid layout
 * for form fields across all master pages.
 * 
 * On desktop: 2 columns
 * On mobile: 1 column
 */
export const FormLayout: React.FC<FormLayoutProps> = ({ children, className = '' }) => {
  return (
    <div className={`form-layout ${className}`}>
      {children}
    </div>
  );
};

interface FormFieldProps {
  children: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}

/**
 * FormField component wraps individual form fields.
 * Use fullWidth prop to span both columns.
 */
export const FormField: React.FC<FormFieldProps> = ({ 
  children, 
  fullWidth = false, 
  className = '' 
}) => {
  return (
    <div className={`form-field ${fullWidth ? 'form-field--full' : ''} ${className}`}>
      {children}
    </div>
  );
};
