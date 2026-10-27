export function Spinner({ size = 20, label }) {
  return (
    <span className="spinner-wrap" role="status">
      <span className="spinner" style={{ width: size, height: size }} />
      {label && <span>{label}</span>}
    </span>
  );
}

export const PageSpinner = ({ label = 'Cargando…' }) => (
  <div className="page-center">
    <Spinner size={32} label={label} />
  </div>
);
