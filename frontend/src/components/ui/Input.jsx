import React, { forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';

export const Input = forwardRef(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  size = 'md', // 'sm' | 'md' | 'lg'
  disabled = false,
  required = false,
  id: customId,
  className = '',
  wrapperClassName = '',
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = customId || generatedId;

  const inputClass = [
    'ui-input',
    `ui-input--${size}`,
    leftIcon ? 'ui-input--has-left' : '',
    rightIcon ? 'ui-input--has-right' : '',
    error ? 'ui-input--error' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={`ui-input-field ${disabled ? 'ui-input-field--disabled' : ''} ${wrapperClassName}`}>
      {label && (
        <label htmlFor={inputId} className="ui-input-label">
          {label}
          {required && <span className="ui-input-required" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="ui-input-container">
        {leftIcon && <span className="ui-input-icon ui-input-icon--left">{leftIcon}</span>}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined}
          className={inputClass}
          {...props}
        />
        {rightIcon && <span className="ui-input-icon ui-input-icon--right">{rightIcon}</span>}
      </div>

      {error ? (
        <div id={`${inputId}-error`} className="ui-input-error" role="alert">
          <AlertCircle size={13} aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : helperText ? (
        <div id={`${inputId}-help`} className="ui-input-helper">
          {helperText}
        </div>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
