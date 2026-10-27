import { Spinner } from './Spinner.jsx';

// variant: primary | secondary | danger | ghost
export function Button({ variant = 'primary', size, loading = false, disabled, children, className = '', ...props }) {
  const cls = ['btn', `btn-${variant}`, size === 'sm' && 'btn-sm', className].filter(Boolean).join(' ');
  return (
    <button className={cls} disabled={disabled || loading} {...props}>
      {loading && <Spinner size={14} />}
      {children}
    </button>
  );
}
