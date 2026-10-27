import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jobsApi, ticketsApi } from '../api/endpoints.js';
import { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  canChangeStatus,
  canManage,
  formatDate,
  QUEUE_LABEL,
  STATUS_LABEL,
  STATUS_TRANSITIONS,
} from '../lib/constants.js';
import { AssignmentBadge, useTicketJobs } from '../components/AssignmentBadge.jsx';
import { JobStatusBadge, PriorityBadge, StatusBadge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { PageSpinner } from '../components/ui/Spinner.jsx';

export default function TicketDetailPage() {
  const { id } = useParams();
  const { state } = useLocation();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: ticket, isLoading, error } = useQuery({ queryKey: ['ticket', id], queryFn: () => ticketsApi.get(id) });
  const created = !!state?.created;
  const { data: jobs = [] } = useTicketJobs(id, { expectAssignment: created });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    queryClient.invalidateQueries({ queryKey: ['ticket-jobs', id] });
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
  };

  const changeStatus = useMutation({
    mutationFn: (status) => ticketsApi.changeStatus(id, status),
    onSuccess: () => {
      toast.success('Estado actualizado');
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: () => ticketsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket eliminado');
      navigate('/tickets', { replace: true });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const retry = useMutation({
    mutationFn: (job) => jobsApi.retry(job.queue, job.jobId),
    onSuccess: () => {
      toast.info('Job reencolado');
      invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading) return <PageSpinner />;
  if (error) return <p className="error-text">{getErrorMessage(error)}</p>;

  const nextStatuses = canChangeStatus(user, ticket) ? STATUS_TRANSITIONS[ticket.status] : [];
  const manageable = canManage(user, ticket);

  return (
    <>
      <div className="page-header">
        <h2>{ticket.title}</h2>
        <div className="row">
          {manageable && (
            <>
              <Link to={`/tickets/${id}/edit`}>
                <Button variant="secondary">Editar</Button>
              </Link>
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Eliminar
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="card detail">
        <div className="detail-meta">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <span>
            Asignado a: <strong>{ticket.assignedTo?.name ?? 'Sin asignar'}</strong>
          </span>
          <AssignmentBadge ticketId={id} expectAssignment={created && !ticket.assignedTo} />
        </div>
        <p className="description">{ticket.description}</p>
        <p className="muted">
          Creado por {ticket.createdBy.name} · {formatDate(ticket.createdAt)} · Actualizado {formatDate(ticket.updatedAt)}
        </p>

        {nextStatuses.length > 0 && (
          <div className="row">
            <span>Cambiar estado:</span>
            {nextStatuses.map((s) => (
              <Button key={s} size="sm" loading={changeStatus.isPending} onClick={() => changeStatus.mutate(s)}>
                {STATUS_LABEL[s]}
              </Button>
            ))}
          </div>
        )}
      </div>

      <h3>Historial de jobs</h3>
      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Cola</th>
              <th>Job</th>
              <th>Estado</th>
              <th>Intentos</th>
              <th>Error</th>
              <th>Fecha</th>
              {user.role === 'ADMIN' && <th />}
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  Aún no hay jobs para este ticket
                </td>
              </tr>
            )}
            {jobs.map((j) => (
              <tr key={j.id}>
                <td>{QUEUE_LABEL[j.queue] ?? j.queue}</td>
                <td>{j.name}</td>
                <td>
                  <JobStatusBadge status={j.status} />
                </td>
                <td>{j.attempts}/3</td>
                <td className="error-cell">{j.error ?? '—'}</td>
                <td>{formatDate(j.updatedAt)}</td>
                {user.role === 'ADMIN' && (
                  <td>
                    {j.status === 'FAILED' && (
                      <Button size="sm" variant="secondary" loading={retry.isPending} onClick={() => retry.mutate(j)}>
                        Reintentar
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={confirmDelete}
        title="Eliminar ticket"
        onClose={() => setConfirmDelete(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
              Eliminar
            </Button>
          </>
        }
      >
        ¿Seguro que quieres eliminar este ticket? Esta acción no se puede deshacer.
      </Modal>
    </>
  );
}
