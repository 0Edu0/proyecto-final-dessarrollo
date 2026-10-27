import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '../api/endpoints.js';
import { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { canChangeStatus, STATUSES, STATUS_LABEL, STATUS_TRANSITIONS } from '../lib/constants.js';
import { PriorityBadge } from '../components/ui/Badge.jsx';
import { PageSpinner } from '../components/ui/Spinner.jsx';

export default function BoardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [dragging, setDragging] = useState(null); // ticket que se está arrastrando
  const [overColumn, setOverColumn] = useState(null);

  // El backend limita a 100 por página, suficiente para el tablero de la demo
  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets', 'board'],
    queryFn: () => ticketsApi.list({ limit: 100 }),
  });

  const move = useMutation({
    mutationFn: ({ id, status }) => ticketsApi.changeStatus(id, status),
    onSuccess: (ticket) => {
      toast.success(`Ticket movido a "${STATUS_LABEL[ticket.status]}"`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
  });

  if (isLoading) return <PageSpinner />;
  if (error) return <p className="error-text">{getErrorMessage(error)}</p>;

  const tickets = data.data;
  const isValidDrop = (status) => dragging && STATUS_TRANSITIONS[dragging.status].includes(status);

  const handleDrop = (status) => {
    if (isValidDrop(status)) move.mutate({ id: dragging.id, status });
    else if (dragging && dragging.status !== status) {
      toast.error(`No se puede pasar de ${STATUS_LABEL[dragging.status]} a ${STATUS_LABEL[status]}`);
    }
    setDragging(null);
    setOverColumn(null);
  };

  return (
    <>
      <div className="page-header">
        <h2>Tablero</h2>
        {(user.role === 'CLIENT') && <span className="muted">Vista de solo lectura</span>}
      </div>
      <div className="board">
        {STATUSES.map((status) => {
          const column = tickets.filter((t) => t.status === status);
          const cls = ['column', overColumn === status && isValidDrop(status) && 'drop-ok'].filter(Boolean).join(' ');
          return (
            <section
              key={status}
              className={cls}
              onDragOver={(e) => {
                e.preventDefault();
                setOverColumn(status);
              }}
              onDragLeave={() => setOverColumn(null)}
              onDrop={() => handleDrop(status)}
            >
              <h3>
                {STATUS_LABEL[status]} <span className="count">{column.length}</span>
              </h3>
              {column.map((t) => {
                const draggable = canChangeStatus(user, t) && STATUS_TRANSITIONS[t.status].length > 0;
                return (
                  <article
                    key={t.id}
                    className={`kanban-card priority-${t.priority} ${draggable ? 'draggable' : ''}`}
                    draggable={draggable}
                    onDragStart={() => setDragging(t)}
                    onDragEnd={() => {
                      setDragging(null);
                      setOverColumn(null);
                    }}
                  >
                    <Link to={`/tickets/${t.id}`}>{t.title}</Link>
                    <div className="kanban-meta">
                      <PriorityBadge priority={t.priority} />
                      <small className="muted">{t.assignedTo?.name ?? 'Sin asignar'}</small>
                    </div>
                  </article>
                );
              })}
              {column.length === 0 && <p className="empty">Sin tickets</p>}
            </section>
          );
        })}
      </div>
      {user.role !== 'CLIENT' && <p className="muted hint">Arrastra una tarjeta a la columna siguiente para cambiar su estado.</p>}
    </>
  );
}
