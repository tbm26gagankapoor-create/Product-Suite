import { useState, useCallback, useMemo } from 'react';

// Validation Rule Types
export type ValidationRule<T = any> = {
  required?: boolean | string;
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  min?: { value: number; message: string };
  max?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  email?: boolean | string;
  url?: boolean | string;
  custom?: (value: T, formValues: Record<string, any>) => string | undefined;
};

export type ValidationRules<T extends Record<string, any>> = {
  [K in keyof T]?: ValidationRule<T[K]>;
};

export type FormErrors<T extends Record<string, any>> = {
  [K in keyof T]?: string;
};

export type TouchedFields<T extends Record<string, any>> = {
  [K in keyof T]?: boolean;
};

interface UseFormValidationOptions<T extends Record<string, any>> {
  initialValues: T;
  validationRules?: ValidationRules<T>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

interface UseFormValidationReturn<T extends Record<string, any>> {
  values: T;
  errors: FormErrors<T>;
  touched: TouchedFields<T>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setValues: (values: Partial<T>) => void;
  setError: <K extends keyof T>(field: K, error: string | undefined) => void;
  setTouched: <K extends keyof T>(field: K, isTouched?: boolean) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  validateField: <K extends keyof T>(field: K) => string | undefined;
  validateForm: () => boolean;
  resetForm: () => void;
  setSubmitting: (isSubmitting: boolean) => void;
  getFieldProps: <K extends keyof T>(field: K) => {
    name: K;
    value: T[K];
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  };
  getFieldError: <K extends keyof T>(field: K) => string | undefined;
  isFieldInvalid: <K extends keyof T>(field: K) => boolean;
}

// Email validation regex
const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
// URL validation regex
const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;

export function useFormValidation<T extends Record<string, any>>({
  initialValues,
  validationRules = {},
  validateOnChange = true,
  validateOnBlur = true,
}: UseFormValidationOptions<T>): UseFormValidationReturn<T> {
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [touched, setTouchedState] = useState<TouchedFields<T>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate a single field
  const validateField = useCallback(
    <K extends keyof T>(field: K): string | undefined => {
      const value = values[field];
      const rules = validationRules[field];

      if (!rules) return undefined;

      // Required validation
      if (rules.required) {
        const isEmpty =
          value === undefined ||
          value === null ||
          value === '' ||
          (Array.isArray(value) && value.length === 0);

        if (isEmpty) {
          return typeof rules.required === 'string'
            ? rules.required
            : `${String(field)} is required`;
        }
      }

      // Skip other validations if value is empty and not required
      if (value === undefined || value === null || value === '') {
        return undefined;
      }

      // MinLength validation
      if (rules.minLength && typeof value === 'string') {
        if (value.length < rules.minLength.value) {
          return rules.minLength.message;
        }
      }

      // MaxLength validation
      if (rules.maxLength && typeof value === 'string') {
        if (value.length > rules.maxLength.value) {
          return rules.maxLength.message;
        }
      }

      // Min validation (for numbers)
      if (rules.min && typeof value === 'number') {
        if (value < rules.min.value) {
          return rules.min.message;
        }
      }

      // Max validation (for numbers)
      if (rules.max && typeof value === 'number') {
        if (value > rules.max.value) {
          return rules.max.message;
        }
      }

      // Pattern validation
      if (rules.pattern && typeof value === 'string') {
        if (!rules.pattern.value.test(value)) {
          return rules.pattern.message;
        }
      }

      // Email validation
      if (rules.email && typeof value === 'string') {
        if (!EMAIL_REGEX.test(value)) {
          return typeof rules.email === 'string'
            ? rules.email
            : 'Please enter a valid email address';
        }
      }

      // URL validation
      if (rules.url && typeof value === 'string') {
        if (!URL_REGEX.test(value)) {
          return typeof rules.url === 'string'
            ? rules.url
            : 'Please enter a valid URL';
        }
      }

      // Custom validation
      if (rules.custom) {
        return rules.custom(value, values);
      }

      return undefined;
    },
    [values, validationRules]
  );

  // Validate entire form
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors<T> = {};
    let isValid = true;

    for (const field of Object.keys(validationRules) as Array<keyof T>) {
      const error = validateField(field);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);

    // Mark all fields as touched
    const allTouched: TouchedFields<T> = {};
    for (const field of Object.keys(values) as Array<keyof T>) {
      allTouched[field] = true;
    }
    setTouchedState(allTouched);

    return isValid;
  }, [validateField, validationRules, values]);

  // Set single value
  const setValue = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setValuesState((prev) => ({ ...prev, [field]: value }));

      if (validateOnChange) {
        // Validate after state update
        setTimeout(() => {
          const error = validateField(field);
          setErrors((prev) => ({ ...prev, [field]: error }));
        }, 0);
      }
    },
    [validateOnChange, validateField]
  );

  // Set multiple values
  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState((prev) => ({ ...prev, ...newValues }));
  }, []);

  // Set error manually
  const setError = useCallback(<K extends keyof T>(field: K, error: string | undefined) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  // Set touched
  const setTouched = useCallback(<K extends keyof T>(field: K, isTouched = true) => {
    setTouchedState((prev) => ({ ...prev, [field]: isTouched }));
  }, []);

  // Handle change event
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      const finalValue =
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

      setValue(name as keyof T, finalValue as T[keyof T]);
    },
    [setValue]
  );

  // Handle blur event
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name } = e.target;
      setTouched(name as keyof T, true);

      if (validateOnBlur) {
        const error = validateField(name as keyof T);
        setErrors((prev) => ({ ...prev, [name]: error }));
      }
    },
    [validateOnBlur, validateField, setTouched]
  );

  // Reset form to initial values
  const resetForm = useCallback(() => {
    setValuesState(initialValues);
    setErrors({});
    setTouchedState({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Set submitting state
  const setSubmitting = useCallback((submitting: boolean) => {
    setIsSubmitting(submitting);
  }, []);

  // Get field props for easy binding
  const getFieldProps = useCallback(
    <K extends keyof T>(field: K) => ({
      name: field,
      value: values[field],
      onChange: handleChange,
      onBlur: handleBlur,
    }),
    [values, handleChange, handleBlur]
  );

  // Get field error (only if touched)
  const getFieldError = useCallback(
    <K extends keyof T>(field: K): string | undefined => {
      return touched[field] ? errors[field] : undefined;
    },
    [errors, touched]
  );

  // Check if field is invalid (touched and has error)
  const isFieldInvalid = useCallback(
    <K extends keyof T>(field: K): boolean => {
      return !!(touched[field] && errors[field]);
    },
    [errors, touched]
  );

  // Computed values
  const isValid = useMemo(
    () => Object.values(errors).every((error) => !error),
    [errors]
  );

  const isDirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initialValues),
    [values, initialValues]
  );

  return {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    isSubmitting,
    setValue,
    setValues,
    setError,
    setTouched,
    handleChange,
    handleBlur,
    validateField,
    validateForm,
    resetForm,
    setSubmitting,
    getFieldProps,
    getFieldError,
    isFieldInvalid,
  };
}

// Form Field Error Component
export const FormFieldError: React.FC<{ error?: string }> = ({ error }) => {
  if (!error) return null;

  return (
    <p className="mt-1 text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      {error}
    </p>
  );
};

export default useFormValidation;
