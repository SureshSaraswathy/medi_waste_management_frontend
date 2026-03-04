/**
 * User Validation Service
 * 
 * Validates user form fields including:
 * - Employee Code uniqueness
 * - Identity number formats (Aadhaar, PAN, Driving License, PF, UAN, ESI)
 */

export interface ValidationResult {
  isValid: boolean;
  message: string;
}

/**
 * Validate Aadhaar Number
 * Rule: Exactly 12 digits, numeric only
 * Regex: ^[0-9]{12}$
 */
export const validateAadhaar = (value: string): ValidationResult => {
  if (!value || value.trim() === '') {
    return { isValid: true, message: '' }; // Optional field
  }
  
  // Remove spaces and hyphens for validation
  const cleaned = value.replace(/[\s-]/g, '');
  
  if (!/^[0-9]{12}$/.test(cleaned)) {
    return {
      isValid: false,
      message: 'Invalid Aadhaar number. It must contain exactly 12 digits.'
    };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate PAN Number
 * Rule: First 5 alphabets, next 4 numbers, last 1 alphabet, total 10
 * Regex: ^[A-Z]{5}[0-9]{4}[A-Z]{1}$
 */
export const validatePAN = (value: string): ValidationResult => {
  if (!value || value.trim() === '') {
    return { isValid: true, message: '' }; // Optional field
  }
  
  const cleaned = value.toUpperCase().trim();
  
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleaned)) {
    return {
      isValid: false,
      message: 'Invalid PAN format. Example: ABCDE1234F'
    };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate Driving License Number
 * Rule: Alphanumeric, length between 10 and 16
 * Regex: ^[A-Z0-9]{10,16}$
 */
export const validateDrivingLicense = (value: string): ValidationResult => {
  if (!value || value.trim() === '') {
    return { isValid: true, message: '' }; // Optional field
  }
  
  const cleaned = value.toUpperCase().trim();
  
  if (!/^[A-Z0-9]{10,16}$/.test(cleaned)) {
    return {
      isValid: false,
      message: 'Invalid Driving License number.'
    };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate PF Number
 * Rule: Alphanumeric, length between 10 and 22
 * Regex: ^[A-Z0-9]{10,22}$
 */
export const validatePFNumber = (value: string): ValidationResult => {
  if (!value || value.trim() === '') {
    return { isValid: true, message: '' }; // Optional field
  }
  
  const cleaned = value.toUpperCase().trim();
  
  if (!/^[A-Z0-9]{10,22}$/.test(cleaned)) {
    return {
      isValid: false,
      message: 'Invalid PF number. Must be 10-22 alphanumeric characters.'
    };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate UAN Number
 * Rule: Exactly 12 digits, numeric only
 * Regex: ^[0-9]{12}$
 */
export const validateUAN = (value: string): ValidationResult => {
  if (!value || value.trim() === '') {
    return { isValid: true, message: '' }; // Optional field
  }
  
  // Remove spaces and hyphens for validation
  const cleaned = value.replace(/[\s-]/g, '');
  
  if (!/^[0-9]{12}$/.test(cleaned)) {
    return {
      isValid: false,
      message: 'Invalid UAN number. It must contain 12 digits.'
    };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate ESI Number
 * Rule: Exactly 10 digits, numeric only
 * Regex: ^[0-9]{10}$
 */
export const validateESINumber = (value: string): ValidationResult => {
  if (!value || value.trim() === '') {
    return { isValid: true, message: '' }; // Optional field
  }
  
  // Remove spaces and hyphens for validation
  const cleaned = value.replace(/[\s-]/g, '');
  
  if (!/^[0-9]{10}$/.test(cleaned)) {
    return {
      isValid: false,
      message: 'Invalid ESI number. It must contain 10 digits.'
    };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Check Employee Code Uniqueness
 * This should be called before saving to check if employee code already exists
 */
export const checkEmployeeCodeUniqueness = async (
  employeeCode: string,
  currentUserId: string | null,
  allUsers: Array<{ id: string; empCode: string }>
): Promise<ValidationResult> => {
  if (!employeeCode || employeeCode.trim() === '') {
    return {
      isValid: false,
      message: 'Employee Code is required.'
    };
  }
  
  const trimmedCode = employeeCode.trim();
  
  // Check if code already exists (excluding current user if editing)
  const duplicate = allUsers.find(user => 
    user.empCode && 
    user.empCode.trim().toLowerCase() === trimmedCode.toLowerCase() &&
    user.id !== currentUserId
  );
  
  if (duplicate) {
    return {
      isValid: false,
      message: 'Employee Code already exists. Please enter a unique code.'
    };
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate all identity fields at once
 */
export const validateAllIdentityFields = (formData: {
  aadhaar?: string;
  pan?: string;
  dlNum?: string;
  pfNum?: string;
  uan?: string;
  esiNum?: string;
}): { [key: string]: ValidationResult } => {
  return {
    aadhaar: validateAadhaar(formData.aadhaar || ''),
    pan: validatePAN(formData.pan || ''),
    dlNum: validateDrivingLicense(formData.dlNum || ''),
    pfNum: validatePFNumber(formData.pfNum || ''),
    uan: validateUAN(formData.uan || ''),
    esiNum: validateESINumber(formData.esiNum || ''),
  };
};
