import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '../api/endpoints.js';
import { Spinner } from './ui/Spinner.jsx';
import { Badge } from './ui/Badge.jsx';

const ASSIGNMENT_QUEUE = 'ticket-assignment';
const isTerminal = (job) => job.status === 'COMPLETED' || job.status === 'FAILED';
const MAX_POLLS = 60; // 2 min: evita polling infinito si el job nunca aparece

// Jobs del ticket con polling cada 2 s mientras haya alguno sin terminar.
// expectAssignment: el ticket es nuevo, así que se espera que aparezca el job de asignación.
export function useTicketJobs(ticketId, { expectAssignment = false } = {}) {
  return useQuery({
    queryKey: ['ticket-jobs', ticketId],
    queryFn: () => ticketsApi.jobs(ticketId),
    refetchInterval: (query) => {
      if (query.state.dataUpdateCount >= MAX_POLLS) return false;
      const jobs = query.state.data;
      if (!jobs) return 2000;
      const pending = jobs.some((j) => !isTerminal(j));
      const waitingForAssignment = expectAssignment && !jobs.some((j) => j.queue === ASSIGNMENT_QUEUE);
      return pending || waitingForAssignment ? 2000 : false;
    },
  });
}

// Badge "Asignando…" → "Asignado" / "Asignación fallida"
export function AssignmentBadge({ ticketId, expectAssignment }) {
  const queryClient = useQueryClient();
  const { data: jobs } = useTicketJobs(ticketId, { expectAssignment });
  const job = jobs?.find((j) => j.queue === ASSIGNMENT_QUEUE);
  const status = job?.status;

  // Al terminar la asignación se refresca el ticket para mostrar al técnico
  useEffect(() => {
    if (status === 'COMPLETED') {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    }
  }, [status, ticketId, queryClient]);

  if (!job && !expectAssignment) return null;
  if (status === 'COMPLETED') return <Badge tone="green">Asignado</Badge>;
  if (status === 'FAILED') return <Badge tone="red">Asignación fallida</Badge>;
  if (status === 'RETRYING') {
    return (
      <Badge tone="amber">
        <Spinner size={12} /> Reintentando asignación ({job.attempts}/3)
      </Badge>
    );
  }
  return (
    <Badge tone="blue">
      <Spinner size={12} /> Asignando…
    </Badge>
  );
}
