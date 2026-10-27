import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '../api/endpoints.js';
import { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { canManage, PRIORITIES, PRIORITY_LABEL } from '../lib/constants.js';
import { ticketSchema } from '../lib/schemas.js';
import { applyServerErrors, zodResolver } from '../lib/zodResolver.js';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Select } from '../components/ui/Select.jsx';
import { PageSpinner } from '../components/ui/Spinner.jsx';

const priorityOptions = PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }));

// Sirve para crear (/tickets/new) y editar (/tickets/:id/edit)
export default function TicketFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsApi.get(id),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(ticketSchema),
    defaultValues: { title: '', description: '', priority: 'MEDIUM' },
  });

  useEffect(() => {
    if (ticket) reset({ title: ticket.title, description: ticket.description, priority: ticket.priority });
  }, [ticket, reset]);

  const save = useMutation({
    mutationFn: (values) => (isEdit ? ticketsApi.update(id, values) : ticketsApi.create(values)),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', saved.id] });
      toast.success(isEdit ? 'Ticket actualizado' : 'Ticket creado');
      // `created` activa el badge "Asignando…" en el detalle
      navigate(`/tickets/${saved.id}`, { state: { created: !isEdit } });
    },
    onError: (err) => {
      if (!applyServerErrors(err, setError)) toast.error(getErrorMessage(err));
    },
  });

  if (isEdit && isLoading) return <PageSpinner />;
  if (isEdit && error) return <p className="error-text">{getErrorMessage(error)}</p>;
  if (isEdit && !canManage(user, ticket)) {
    return <p className="error-text">No puedes editar este ticket (solo ADMIN, o el dueño mientras esté abierto).</p>;
  }

  return (
    <>
      <div className="page-header">
        <h2>{isEdit ? 'Editar ticket' : 'Nuevo ticket'}</h2>
      </div>
      <form className="card form-card" onSubmit={handleSubmit((v) => save.mutate(v))} noValidate>
        <Input label="Título" error={errors.title?.message} {...register('title')} />
        <Input label="Descripción" multiline rows={6} error={errors.description?.message} {...register('description')} />
        <Select label="Prioridad" options={priorityOptions} error={errors.priority?.message} {...register('priority')} />
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" loading={save.isPending}>
            {isEdit ? 'Guardar cambios' : 'Crear ticket'}
          </Button>
        </div>
      </form>
    </>
  );
}
