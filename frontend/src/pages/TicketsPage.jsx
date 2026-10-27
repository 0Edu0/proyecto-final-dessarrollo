import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ticketsApi } from '../api/endpoints.js';
import { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate, PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL } from '../lib/constants.js';
import { PriorityBadge, StatusBadge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Select } from '../components/ui/Select.jsx';
import { PageSpinner } from '../components/ui/Spinner.jsx';

const LIMIT = 10;
const toOptions = (values, labels) => values.map((v) => ({ value: v, label: labels[v] }));

export default function TicketsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const priority = params.get('priority') ?? '';
  const page = Number(params.get('page') ?? 1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets', { status, priority, page }],
    queryFn: () => ticketsApi.list({ page, limit: LIMIT, status: status || undefined, priority: priority || undefined }),
    placeholderData: keepPreviousData,
  });

  // Cambiar un filtro vuelve a la página 1
  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    next.delete('page');
    setParams(next);
  };
  const setPage = (p) => {
    const next = new URLSearchParams(params);
    next.set('page', p);
    setParams(next);
  };

  const showCreator = user.role !== 'CLIENT';

  return (
    <>
      <div className="page-header">
        <h2>{user.role === 'CLIENT' ? 'Mis tickets' : 'Tickets'}</h2>
        {user.role !== 'TECH' && (
          <Link to="/tickets/new">
            <Button>+ Nuevo ticket</Button>
          </Link>
        )}
      </div>

      <div className="filters">
        <Select
          label="Estado"
          placeholder="Todos"
          value={status}
          options={toOptions(STATUSES, STATUS_LABEL)}
          onChange={(e) => setFilter('status', e.target.value)}
        />
        <Select
          label="Prioridad"
          placeholder="Todas"
          value={priority}
          options={toOptions(PRIORITIES, PRIORITY_LABEL)}
          onChange={(e) => setFilter('priority', e.target.value)}
        />
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : error ? (
        <p className="error-text">{getErrorMessage(error)}</p>
      ) : (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>Título</th>
                <th>Estado</th>
                <th>Prioridad</th>
                <th>Asignado a</th>
                {showCreator && <th>Creado por</th>}
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {data.data.length === 0 && (
                <tr>
                  <td colSpan={showCreator ? 6 : 5} className="empty">
                    No hay tickets con estos filtros
                  </td>
                </tr>
              )}
              {data.data.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link to={`/tickets/${t.id}`}>{t.title}</Link>
                  </td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                  <td>
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td>{t.assignedTo?.name ?? <span className="muted">Sin asignar</span>}</td>
                  {showCreator && <td>{t.createdBy.name}</td>}
                  <td>{formatDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <span className="muted">
              {data.pagination.total} tickets · página {data.pagination.page} de {Math.max(data.pagination.totalPages, 1)}
            </span>
            <div>
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>{' '}
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
