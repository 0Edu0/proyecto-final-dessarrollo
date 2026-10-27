import { forwardRef, useId } from 'react';

// Campo con etiqueta y mensaje de error; compatible con register() de React Hook Form
export const Input = forwardRef(function Input({ label, error, multiline, className = '', ...props }, ref) {
  const id = useId();
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div className={`field ${className}`}>
      {label && <label htmlFor={id}>{label}</label>}
      <Tag id={id} ref={ref} className={error ? 'has-error' : ''} aria-invalid={!!error} {...props} />
      {error && <span className="field-error">{error}</span>}
    </div>
  );
});
