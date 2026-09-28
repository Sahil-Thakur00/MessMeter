import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { api } from './api.js';
import Login from './pages/Login.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Today from './pages/Today.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import AdminMenu from './pages/AdminMenu.jsx';
import Report from './pages/Report.jsx';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

// Nav icons
function TodayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function RateIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function LeaderboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function BottomNav({ role }) {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      <div className="bottom-nav__inner">
        <NavLink to="/today" id="nav-today" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <TodayIcon />
          Today
        </NavLink>
        <NavLink to="/rate" id="nav-rate" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <RateIcon />
          Rate
        </NavLink>
        <NavLink to="/leaderboard" id="nav-leaderboard" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <LeaderboardIcon />
          Ranks
        </NavLink>
        {role === 'admin' && (
          <NavLink to="/admin" id="nav-admin" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <AdminIcon />
            Admin
          </NavLink>
        )}
      </div>
    </nav>
  );
}

function AuthGuard({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminGuard({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/today" replace />;
  return children;
}

function PageShell({ user, children }) {
  return (
    <>
      <div className="page-wrap">{children}</div>
      <BottomNav role={user?.role} />
    </>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    api.get('/auth/me')
      .then(data => setUser(data))
      .catch(() => setUser(null));
  }, []);

  function handleLogin(userData) {
    setUser(userData);
  }

  if (user === undefined) {
    return (
      <div className="spinner-wrap" style={{ minHeight: '100dvh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <AuthCtx.Provider value={{ user, setUser }}>
      <BrowserRouter>
        <div className="shell">
          <Routes>
            <Route path="/login" element={
              user ? <Navigate to="/today" replace /> : <Login onLogin={handleLogin} />
            } />

            <Route path="/today" element={
              <AuthGuard user={user}>
                <PageShell user={user}><Today /></PageShell>
              </AuthGuard>
            } />

            <Route path="/rate" element={
              <AuthGuard user={user}>
                <PageShell user={user}><Onboarding /></PageShell>
              </AuthGuard>
            } />

            <Route path="/leaderboard" element={
              <AuthGuard user={user}>
                <PageShell user={user}><Leaderboard /></PageShell>
              </AuthGuard>
            } />

            <Route path="/admin" element={
              <AdminGuard user={user}>
                <PageShell user={user}><AdminMenu /></PageShell>
              </AdminGuard>
            } />

            <Route path="/admin/report" element={
              <AdminGuard user={user}>
                <PageShell user={user}><Report /></PageShell>
              </AdminGuard>
            } />

            <Route path="*" element={
              user ? <Navigate to="/today" replace /> : <Navigate to="/login" replace />
            } />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthCtx.Provider>
  );
}
