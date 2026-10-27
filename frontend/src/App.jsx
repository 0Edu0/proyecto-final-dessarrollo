import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import TicketsPage from './pages/TicketsPage.jsx';
import BoardPage from './pages/BoardPage.jsx';
import TicketDetailPage from './pages/TicketDetailPage.jsx';
import TicketFormPage from './pages/TicketFormPage.jsx';
import AdminUsersPage from './pages/AdminUsersPage.jsx';
import AdminJobsPage from './pages/AdminJobsPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/board" element={<BoardPage />} />
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
          <Route path="/tickets/:id/edit" element={<TicketFormPage />} />

          <Route element={<ProtectedRoute roles={['CLIENT', 'ADMIN']} />}>
            <Route path="/tickets/new" element={<TicketFormPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/jobs" element={<AdminJobsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/tickets" replace />} />
    </Routes>
  );
}
