import { forwardRef, useId } from 'react';

// options: [{ value, label }]
export const Select = forwardRef(function Select({ label, error, options, placeholder, className = '', ...props }, ref) {
  const id = useId();
  return (
    <div className={`field ${className}`}>
      {label && <label htmlFor={id}>{label}</label>}
      <select id={id} ref={ref} className={error ? 'has-error' : ''} aria-invalid={!!error} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
});
