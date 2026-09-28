import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Leaderboard() {
  const navigate = useNavigate();
  const [dishes, setDishes] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dishes?sort=score')
      .then(setDishes)
      .catch(() => setError('Failed to load leaderboard.'));
  }, []);

  if (!dishes) {
    return (
      <div>
        <div className="page-header"><h1>Leaderboard</h1></div>
        {error
          ? <div className="error-banner">{error}</div>
          : <div className="spinner-wrap"><div className="spinner" /></div>}
      </div>
    );
  }

  const rated = dishes.filter(d => d.rated);
  const unrated = dishes.filter(d => !d.rated);
  const topScore = rated.length > 0 ? rated[0].up / rated[0].total : 1;

  function medalLabel(i) {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return `#${i + 1}`;
  }

  return (
    <div className="fade-up">
      <button
        id="btn-back-to-today"
        className="back-link"
        onClick={() => navigate('/today')}
        style={{ marginBottom: 12 }}
      >
        ← Back to Today's Menu
      </button>

      <div className="page-header">
        <h1>Dish Leaderboard</h1>
        <span className="page-header__sub">{rated.length} ranked dishes</span>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="lb-card fade-up">
        {rated.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 20px' }}>
            <div className="empty-state__icon">🏆</div>
            <h2>No ratings yet</h2>
            <p>Vote on dishes to unlock the leaderboard.</p>
          </div>
        ) : rated.map((dish, i) => {
          const pct = dish.total > 0 ? Math.round((dish.up / dish.total) * 100) : 0;
          return (
            <div key={dish.dishId} className="lb-item">
              <div className="lb-rank">{medalLabel(i)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="lb-name">{dish.name}</div>
                <div className="lb-bar">
                  <div className="lb-bar__fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="lb-stat">
                <div className="lb-stat__pct">{pct}%</div>
                <div className="lb-stat__votes">{dish.total} votes</div>
              </div>
            </div>
          );
        })}
      </div>

      {unrated.length > 0 && (
        <>
          <div className="lb-section-title">Not enough votes yet</div>
          <div className="lb-card">
            {unrated.map(dish => (
              <div key={dish.dishId} className="lb-item">
                <div className="lb-rank" style={{ color: 'var(--text-3)' }}>—</div>
                <div className="lb-name" style={{ color: 'var(--text-2)' }}>{dish.name}</div>
                <div className="lb-stat">
                  <div className="lb-stat__votes">{dish.total} vote{dish.total !== 1 ? 's' : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
