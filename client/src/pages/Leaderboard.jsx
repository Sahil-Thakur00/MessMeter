import { useState, useEffect } from 'react';
import { api } from '../api.js';

function BarFill({ pct }) {
  return (
    <div className="lb-bar">
      <div className="lb-bar__fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export default function Leaderboard() {
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

  function rankClass(i) {
    if (i === 0) return 'lb-rank top1';
    if (i === 1) return 'lb-rank top2';
    if (i === 2) return 'lb-rank top3';
    return 'lb-rank';
  }

  return (
    <div>
      <div className="page-header">
        <h1>Leaderboard</h1>
        <span className="page-header__sub">{rated.length} rated</span>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card fade-up" style={{ padding: 0 }}>
        {rated.length === 0 && (
          <div style={{ padding: '24px 16px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
            No rated dishes yet — vote to unlock rankings!
          </div>
        )}
        {rated.map((dish, i) => {
          const pct = dish.total > 0 ? Math.round((dish.up / dish.total) * 100) : 0;
          return (
            <div key={dish.dishId} className="lb-item">
              <div className={rankClass(i)}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="lb-name">{dish.name}</div>
                <BarFill pct={pct} />
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
          <div className="card" style={{ padding: 0 }}>
            {unrated.map(dish => (
              <div key={dish.dishId} className="lb-item">
                <div className="lb-rank" style={{ color: 'var(--text-muted)' }}>—</div>
                <div className="lb-name" style={{ color: 'var(--text-secondary)' }}>{dish.name}</div>
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
