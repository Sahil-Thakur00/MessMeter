import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { api } from './api.js';
import Login from './pages/Login.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Today from './pages/Today.jsx';
import Leaderboard from './pages/Leaderboard.jsx';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

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

function BottomNav({ user, onLogout }) {
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
          Leaderboard
        </NavLink>
      </div>
    </nav>
  );
}

function AuthGuard({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(undefined); // undefined=loading, null=guest
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    api.get('/auth/me')
      .then(data => {
        setUser(data);
        const key = `mm_onboarded_${data.userId}`;
        if (localStorage.getItem(key)) setOnboardingDone(true);
      })
      .catch(() => setUser(null));
  }, []);

  function handleLogin(userData) {
    setUser(userData);
    const key = `mm_onboarded_${userData.userId}`;
    if (localStorage.getItem(key)) setOnboardingDone(true);
  }

  function handleOnboardingDone(userId) {
    const key = `mm_onboarded_${userId}`;
    localStorage.setItem(key, '1');
    setOnboardingDone(true);
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
                <>
                  <div className="page-wrap">
                    <Today />
                  </div>
                  <BottomNav user={user} />
                </>
              </AuthGuard>
            } />

            <Route path="/rate" element={
              <AuthGuard user={user}>
                <>
                  <div className="page-wrap">
                    <Onboarding onDone={() => handleOnboardingDone(user?.userId)} />
                  </div>
                  <BottomNav user={user} />
                </>
              </AuthGuard>
            } />

            <Route path="/leaderboard" element={
              <AuthGuard user={user}>
                <>
                  <div className="page-wrap">
                    <Leaderboard />
                  </div>
                  <BottomNav user={user} />
                </>
              </AuthGuard>
            } />

            <Route path="*" element={
              user
                ? <Navigate to={onboardingDone ? '/today' : '/rate'} replace />
                : <Navigate to="/login" replace />
            } />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthCtx.Provider>
  );
}
