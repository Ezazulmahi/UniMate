import { useState } from 'react';
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Routine from './pages/Routine';
import Grades from './pages/Grades';
import Resources from './pages/Resources';
import Faculty from './pages/Faculty';
import FacultyDetail from './pages/FacultyDetail';
import Rides from './pages/Rides';
import Tutoring from './pages/Tutoring';
import Messages from './pages/Messages';
import Assistant from './pages/Assistant';
import Profile from './pages/Profile';

const NAV = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/routine', label: 'Routine', icon: '🗓️' },
  { to: '/grades', label: 'CGPA & exams', icon: '🎓' },
  { to: '/resources', label: 'Resources', icon: '📚' },
  { to: '/faculty', label: 'Faculty reviews', icon: '⭐' },
  { to: '/rides', label: 'Ride share', icon: '🚗' },
  { to: '/tutoring', label: 'Study help', icon: '🤝' },
  { to: '/messages', label: 'Messages', icon: '💬' },
  { to: '/assistant', label: 'AI assistant', icon: '✨' },
];

function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setOpen(false);
  }

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">U</span> UniMate
        </div>
        <nav>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
              <span aria-hidden="true">{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <NavLink to="/profile" className="nav-link">
            <span aria-hidden="true">👤</span> {user.name}
          </NavLink>
          <button type="button" className="btn btn-ghost btn-block" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="main">
        <div className="topbar">
          <button type="button" className="btn btn-ghost" aria-label="Open menu" onClick={() => setOpen(true)}>
            ☰
          </button>
          <span className="brand">
            <span className="brand-mark">U</span> UniMate
          </span>
        </div>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center muted">Loading…</div>;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<GuestOnly><AuthPage mode="login" /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><AuthPage mode="register" /></GuestOnly>} />
          <Route element={<RequireAuth />}>
            <Route index element={<Dashboard />} />
            <Route path="routine" element={<Routine />} />
            <Route path="grades" element={<Grades />} />
            <Route path="resources" element={<Resources />} />
            <Route path="faculty" element={<Faculty />} />
            <Route path="faculty/:id" element={<FacultyDetail />} />
            <Route path="rides" element={<Rides />} />
            <Route path="tutoring" element={<Tutoring />} />
            <Route path="messages" element={<Messages />} />
            <Route path="messages/:id" element={<Messages />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
