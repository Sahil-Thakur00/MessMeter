import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function Onboarding({ onDone }) {
  const [dishes, setDishes] = useState(null);
  const [error, setError] = useState('');
  const [voting, setVoting] = useState({});

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await api.get('/onboarding');
      setDishes(data);
    } catch {
      setError('Failed to load dishes.');
    }
  }

  async function vote(dishId, value) {
    setVoting(v => ({ ...v, [dishId]: true }));
    try {
      await api.put(`/votes/${dishId}`, { value });
      setDishes(prev => prev.filter(d => d.dishId !== dishId && d.dishId.toString() !== dishId.toString()));
    } catch {
      // silently ignore single vote failure
    } finally {
      setVoting(v => ({ ...v, [dishId]: false }));
    }
  }

  if (dishes === null) {
    return (
      <div>
        <div className="page-header"><h1>Rate Dishes</h1></div>
        <div className="spinner-wrap"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Rate Dishes</h1>
        <span className="page-header__sub">{dishes.length} left</span>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {dishes.length === 0 ? (
        <div className="onboarding-empty fade-up">
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
          <h2>You're all caught up!</h2>
          <p>You've rated all dishes on the current menu.</p>
        </div>
      ) : (
        <div className="fade-up">
          {dishes.map(dish => (
            <div key={dish.dishId} className="onboard-card">
              <div className="onboard-card__name">{dish.name}</div>
              <div className="onboard-btns">
                <button
                  id={`btn-up-${dish.dishId}`}
                  className="onboard-btn up"
                  onClick={() => vote(dish.dishId, 1)}
                  disabled={voting[dish.dishId]}
                  aria-label={`Thumbs up for ${dish.name}`}
                >
                  👍
                </button>
                <button
                  id={`btn-down-${dish.dishId}`}
                  className="onboard-btn down"
                  onClick={() => vote(dish.dishId, -1)}
                  disabled={voting[dish.dishId]}
                  aria-label={`Thumbs down for ${dish.name}`}
                >
                  👎
                </button>
              </div>
            </div>
          ))}

          <button
            id="btn-skip-onboarding"
            className="btn btn-ghost"
            onClick={onDone}
            style={{ marginTop: 8 }}
          >
            Skip for now
          </button>
        </div>
      )}
    </div>
  );
}
