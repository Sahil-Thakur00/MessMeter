import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function Report() {
  const [dishes, setDishes] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/report?limit=10&minVotes=5')
      .then(setDishes)
      .catch(() => setError('Failed to load report.'));
  }, []);

  function handlePrint() {
    window.print();
  }

  if (!dishes) {
    return (
      <div>
        <div className="page-header"><h1>Disliked Report</h1></div>
        {error
          ? <div className="error-banner">{error}</div>
          : <div className="spinner-wrap"><div className="spinner" /></div>}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Most Disliked</h1>
        <button
          id="btn-print-report"
          className="btn btn-ghost"
          onClick={handlePrint}
          style={{ width: 'auto', padding: '6px 14px', fontSize: '0.8rem' }}
        >
          Print
        </button>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 16 }}>
        Dishes on the current menu with ≥5 votes, ranked worst first.
      </p>

      {error && <div className="error-banner">{error}</div>}

      {dishes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">✅</div>
          <h2>No disliked dishes</h2>
          <p>No rated dishes yet, or all dishes are well-liked!</p>
        </div>
      ) : (
        <div className="lb-card fade-up">
          {dishes.map((dish, i) => (
            <div key={dish.name} className="report-item">
              <div className="report-rank">#{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="report-name">{dish.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>
                  {dish.up} liked · {dish.down} disliked · {dish.total} total
                </div>
              </div>
              <div className="report-score">
                <div className="report-score__val">{(dish.score * 100).toFixed(1)}%</div>
                <div className="report-score__meta">Wilson score</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
