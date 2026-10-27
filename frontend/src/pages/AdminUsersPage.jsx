import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/endpoints.js';
import { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { ROLE_LABEL, ROLES } from '../lib/constants.js';
import { Badge } from '../components/ui/Badge.jsx';
import { Select } from '../components/ui/Select.jsx';
import { PageSpinner } from '../components/ui/Spinner.jsx';

const roleOptions = ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }));

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [role, setRole] = useState('');

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users', role],
    queryFn: () => usersApi.list({ role: role || undefined }),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }) => usersApi.updateRole(id, role),
    onSuccess: (u) => {
      toast.success(`${u.name} ahora es ${ROLE_LABEL[u.role]}`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <>
      <div className="page-header">
        <h2>Usuarios</h2>
      </div>
      <div className="filters">
        <Select
          label="Rol"
          placeholder="Todos"
          value={role}
          options={roleOptions}
          onChange={(e) => setRole(e.target.value)}
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
                <th>Nombre</th>
                <th>Correo</th>
                <th>Activo</th>
                <th>Rol</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.isActive ? <Badge tone="green">Sí</Badge> : <Badge tone="gray">No</Badge>}</td>
                  <td>
                    <Select
                      aria-label={`Rol de ${u.name}`}
                      value={u.role}
                      options={roleOptions}
                      disabled={u.id === me.id || updateRole.isPending}
                      onChange={(e) => updateRole.mutate({ id: u.id, role: e.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
