import { useState } from 'react';
import { api } from '../api.js';

const DEV_AUTH = import.meta.env.VITE_DEV_AUTH === 'true';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function Login({ onLogin }) {
  const [joinCode, setJoinCode] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDevLogin(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !joinCode.trim()) {
      setError('Email and join code are required.');
      return;
    }
    setLoading(true);
    try {
      const data = await api.post('/auth/dev', {
        email: email.trim(),
        name: name.trim() || email.trim(),
        joinCode: joinCode.trim().toUpperCase()
      });
      onLogin(data);
    } catch (err) {
      setError(err.message || 'Login failed. Check your join code.');
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleClick() {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google login is not configured. Use dev login below.');
      return;
    }
    /* global google */
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        setError('');
        setLoading(true);
        try {
          const data = await api.post('/auth/google', {
            credential: response.credential,
            joinCode: joinCode.trim().toUpperCase()
          });
          onLogin(data);
        } catch (err) {
          setError(err.message || 'Google login failed');
        } finally {
          setLoading(false);
        }
      }
    });
    google.accounts.id.prompt();
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-brand__icon">🍽</div>
        <h1 className="login-brand__title">Mess Meter</h1>
        <p className="login-brand__sub">Rate your mess. Know what's worth eating.</p>
      </div>

      <div className="login-box fade-up">
        <p className="login-box__label">Sign in to your mess</p>

        {error && <div className="error-banner" role="alert">{error}</div>}

        <div className="form-field">
          <label htmlFor="joinCode">Mess Join Code</label>
          <input
            id="joinCode"
            type="text"
            placeholder="e.g. DEMO01"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            maxLength={8}
            autoCapitalize="characters"
            style={{ letterSpacing: '0.15em', fontWeight: 700 }}
          />
        </div>

        {GOOGLE_CLIENT_ID && (
          <>
            <button
              id="btn-google-login"
              className="google-btn"
              onClick={handleGoogleClick}
              disabled={loading}
              type="button"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"/>
              </svg>
              Continue with Google
            </button>
            <div className="divider">or</div>
          </>
        )}

        {DEV_AUTH && (
          <form onSubmit={handleDevLogin} id="form-dev-login">
            <div className="form-field">
              <label htmlFor="devEmail">Email</label>
              <input
                id="devEmail"
                type="email"
                placeholder="demo1@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="form-field">
              <label htmlFor="devName">Name (optional)</label>
              <input
                id="devName"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <button
              id="btn-dev-login"
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        )}

        {!DEV_AUTH && !GOOGLE_CLIENT_ID && (
          <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', textAlign: 'center', marginTop: 8 }}>
            Configure <code>VITE_GOOGLE_CLIENT_ID</code> to enable login.
          </p>
        )}
      </div>
    </div>
  );
}
