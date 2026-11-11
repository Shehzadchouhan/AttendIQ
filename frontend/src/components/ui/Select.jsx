import React, { forwardRef, useId } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

export const Select = forwardRef(({
  label,
  error,
  helperText,
  leftIcon,
  options = [],
  children,
  size = 'md', // 'sm' | 'md' | 'lg'
  disabled = false,
  required = false,
  id: customId,
  className = '',
  wrapperClassName = '',
  ...props
}, ref) => {
  const generatedId = useId();
  const selectId = customId || generatedId;

  const selectClass = [
    'ui-select',
    `ui-select--${size}`,
    leftIcon ? 'ui-select--has-left' : '',
    error ? 'ui-select--error' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={`ui-input-field ${disabled ? 'ui-input-field--disabled' : ''} ${wrapperClassName}`}>
      {label && (
        <label htmlFor={selectId} className="ui-input-label">
          {label}
          {required && <span className="ui-input-required" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="ui-input-container">
        {leftIcon && <span className="ui-input-icon ui-input-icon--left">{leftIcon}</span>}
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-help` : undefined}
          className={selectClass}
          {...props}
        >
          {options.length > 0
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <span className="ui-select-chevron" aria-hidden="true">
          <ChevronDown size={16} />
        </span>
      </div>

      {error ? (
        <div id={`${selectId}-error`} className="ui-input-error" role="alert">
          <AlertCircle size={13} aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : helperText ? (
        <div id={`${selectId}-help`} className="ui-input-helper">
          {helperText}
        </div>
      ) : null}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
