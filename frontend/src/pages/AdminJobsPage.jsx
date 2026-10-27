import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '../api/endpoints.js';
import { getErrorMessage } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate, JOB_STATUS_LABEL, QUEUE_LABEL } from '../lib/constants.js';
import { JobStatusBadge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Select } from '../components/ui/Select.jsx';
import { PageSpinner } from '../components/ui/Spinner.jsx';

const LIMIT = 20;
const queueOptions = Object.entries(QUEUE_LABEL).map(([value, label]) => ({ value, label }));
const statusOptions = Object.entries(JOB_STATUS_LABEL).map(([value, label]) => ({ value, label }));

export default function AdminJobsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ queue: '', status: '' });
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['jobs', filters, page],
    queryFn: () =>
      jobsApi.list({ page, limit: LIMIT, queue: filters.queue || undefined, status: filters.status || undefined }),
    placeholderData: keepPreviousData,
    refetchInterval: 5000, // la lista se mantiene viva durante la demo
  });

  const retry = useMutation({
    mutationFn: (job) => jobsApi.retry(job.queue, job.jobId),
    onSuccess: () => {
      toast.info('Job reencolado');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  return (
    <>
      <div className="page-header">
        <h2>Jobs de colas</h2>
      </div>
      <div className="filters">
        <Select
          label="Cola"
          placeholder="Todas"
          value={filters.queue}
          options={queueOptions}
          onChange={(e) => setFilter('queue', e.target.value)}
        />
        <Select
          label="Estado"
          placeholder="Todos"
          value={filters.status}
          options={statusOptions}
          onChange={(e) => setFilter('status', e.target.value)}
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
                <th>Cola</th>
                <th>Job</th>
                <th>Ticket</th>
                <th>Estado</th>
                <th>Intentos</th>
                <th>Error</th>
                <th>Actualizado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.data.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty">
                    No hay jobs
                  </td>
                </tr>
              )}
              {data.data.map((j) => (
                <tr key={j.id}>
                  <td>{QUEUE_LABEL[j.queue] ?? j.queue}</td>
                  <td>{j.name}</td>
                  <td>{j.ticketId ? <Link to={`/tickets/${j.ticketId}`}>Ver ticket</Link> : '—'}</td>
                  <td>
                    <JobStatusBadge status={j.status} />
                  </td>
                  <td>{j.attempts}/3</td>
                  <td className="error-cell">{j.error ?? '—'}</td>
                  <td>{formatDate(j.updatedAt)}</td>
                  <td>
                    {j.status === 'FAILED' && (
                      <Button size="sm" variant="secondary" loading={retry.isPending} onClick={() => retry.mutate(j)}>
                        Reintentar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <span className="muted">
              {data.pagination.total} jobs · página {data.pagination.page} de {Math.max(data.pagination.totalPages, 1)}
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
