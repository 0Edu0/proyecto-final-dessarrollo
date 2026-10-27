import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { API_ORIGIN, getErrorMessage } from '../api/client.js';
import { adminApi } from '../api/endpoints.js';
import { ROLE_LABEL } from '../lib/constants.js';
import { Button } from './ui/Button.jsx';

export function Layout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // bull-board se abre en otra pestaña tras canjear una cookie de sesión de corta vida
  const openQueues = async () => {
    try {
      const { url } = await adminApi.openQueuesSession();
      window.open(`${API_ORIGIN}${url}`, '_blank');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const isAdmin = user.role === 'ADMIN';
  const link = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true" />
          HelpDesk Galácticos
        </span>
        <nav>
          <NavLink to="/tickets" end className={link}>
            {user.role === 'CLIENT' ? 'Mis tickets' : 'Tickets'}
          </NavLink>
          <NavLink to="/board" className={link}>
            Tablero
          </NavLink>
          {user.role !== 'TECH' && (
            <NavLink to="/tickets/new" className={link}>
              Nuevo ticket
            </NavLink>
          )}
          {isAdmin && (
            <>
              <NavLink to="/admin/users" className={link}>
                Usuarios
              </NavLink>
              <NavLink to="/admin/jobs" className={link}>
                Jobs
              </NavLink>
              <button className="nav-link nav-button" onClick={openQueues}>
                Colas
              </button>
            </>
          )}
        </nav>
        <div className="user-box">
          <span>
            {user.name} <small>{ROLE_LABEL[user.role]}</small>
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Salir
          </Button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
