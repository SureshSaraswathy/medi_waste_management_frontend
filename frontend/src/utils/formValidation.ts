import toast from 'react-hot-toast';

export const DEFAULT_REQUIRED_MESSAGE = 'Please complete the required fields.';

const ERROR_CLASS = 'ux-invalid-field';
const ERROR_TEXT_CLASS = 'ux-field-error';
const DYNAMIC_ERROR_CLASS = 'ux-dynamic-error';

const getFieldLabel = (field: HTMLElement): string => {
  const id = field.getAttribute('id');
  if (id) {
    const linked = document.querySelector(`label[for="${id}"]`);
    if (linked?.textContent) {
      return linked.textContent.replace('*', '').trim();
    }
  }

  const formGroup = field.closest('.form-group, .ra-assignment-form-group');
  const label = formGroup?.querySelector('label');
  if (label?.textContent) {
    return label.textContent.replace('*', '').trim();
  }

  return 'This field';
};

const removeFieldErrorNode = (field: HTMLElement): void => {
  const formGroup = field.closest('.form-group, .ra-assignment-form-group');
  const dynamicError = formGroup?.querySelector(`.${ERROR_TEXT_CLASS}.${DYNAMIC_ERROR_CLASS}`);
  if (dynamicError) {
    dynamicError.remove();
  }
};

export const clearFieldValidation = (field: HTMLElement | null): void => {
  if (!field) return;
  field.classList.remove(ERROR_CLASS);
  field.removeAttribute('aria-invalid');
  removeFieldErrorNode(field);
};

export const setFieldValidationError = (field: HTMLElement, message: string): void => {
  field.classList.add(ERROR_CLASS);
  field.setAttribute('aria-invalid', 'true');

  const formGroup = field.closest('.form-group, .ra-assignment-form-group');
  if (!formGroup) return;

  const existing = formGroup.querySelector(`.${ERROR_TEXT_CLASS}.${DYNAMIC_ERROR_CLASS}`) as HTMLElement | null;
  if (existing) {
    existing.textContent = message;
    return;
  }

  const errorEl = document.createElement('div');
  errorEl.className = `${ERROR_TEXT_CLASS} ${DYNAMIC_ERROR_CLASS}`;
  errorEl.textContent = message;
  formGroup.appendChild(errorEl);
};

export const validateRequiredFields = (container: HTMLElement): HTMLElement[] => {
  const fields = Array.from(
    container.querySelectorAll<HTMLElement>('input[required], select[required], textarea[required]')
  );

  const invalidFields: HTMLElement[] = [];
  fields.forEach((field) => {
    clearFieldValidation(field);

    const rawValue = (field as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
    const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue;

    if (!value) {
      const label = getFieldLabel(field);
      setFieldValidationError(field, `${label} is required.`);
      invalidFields.push(field);
    }
  });

  return invalidFields;
};

export const focusAndScrollToField = (field: HTMLElement): void => {
  field.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (typeof (field as HTMLInputElement).focus === 'function') {
    (field as HTMLInputElement).focus();
  }
};

export const showValidationToast = (message: string = DEFAULT_REQUIRED_MESSAGE): void => {
  toast.error(message, {
    position: 'top-right',
    duration: 3000,
  });
};
