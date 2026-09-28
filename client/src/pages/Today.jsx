import { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';

const VERDICT_LABEL = {
  go: 'Go for it',
  meh: 'Meh',
  skip: 'Skip',
  insufficient: 'Not enough votes'
};

function VerdictBadge({ verdict }) {
  const cls = verdict === 'insufficient' ? 'insufficient' : verdict;
  return (
    <span className={`verdict-badge ${cls}`} aria-label={`Verdict: ${VERDICT_LABEL[verdict]}`}>
      {verdict === 'go' && '✓ '}
      {verdict === 'skip' && '✕ '}
      {VERDICT_LABEL[verdict] || verdict}
    </span>
  );
}

function DishRow({ dish, onVote }) {
  const { dishId, name, up, total, myVote } = dish;
  const pct = total > 0 ? Math.round((up / total) * 100) : null;

  return (
    <div className="dish-row">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="dish-row__name">{name}</div>
        <div className="dish-row__meta">
          {pct !== null ? `${pct}% liked · ${total} vote${total !== 1 ? 's' : ''}` : 'No votes yet'}
        </div>
      </div>
      <div className="vote-btns">
        <button
          id={`vote-up-${dishId}`}
          className={`vote-btn up${myVote === 1 ? ' active' : ''}`}
          onClick={() => onVote(dishId, myVote === 1 ? 0 : 1)}
          aria-label={`Thumbs up for ${name}`}
          aria-pressed={myVote === 1}
        >
          👍
        </button>
        <button
          id={`vote-down-${dishId}`}
          className={`vote-btn down${myVote === -1 ? ' active' : ''}`}
          onClick={() => onVote(dishId, myVote === -1 ? 0 : -1)}
          aria-label={`Thumbs down for ${name}`}
          aria-pressed={myVote === -1}
        >
          👎
        </button>
      </div>
    </div>
  );
}

function MealCard({ mealData, onVote }) {
  const { meal, dishes, verdict } = mealData;
  const { verdict: v, dragDish } = verdict;

  return (
    <div className="meal-card">
      <div className="meal-card__header">
        <span className="meal-name">{meal}</span>
        <VerdictBadge verdict={v} />
      </div>
      {v === 'skip' && dragDish && (
        <div className="meal-card__drag-dish">
          Skip — {dragDish} is rated low
        </div>
      )}
      {dishes.map(dish => (
        <DishRow key={dish.dishId} dish={dish} onVote={onVote} />
      ))}
    </div>
  );
}

export default function Today() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const res = await api.get('/today');
      setData(res);
    } catch {
      setError('Failed to load today\'s menu.');
    }
  }

  useEffect(() => { load(); }, []);

  // Optimistic vote: update locally first, rollback on error, then refetch that meal
  async function handleVote(dishId, value) {
    const dishIdStr = dishId.toString();

    // Capture previous state for rollback
    const prev = data;

    // Optimistic update
    setData(old => {
      if (!old) return old;
      return {
        ...old,
        meals: old.meals.map(meal => ({
          ...meal,
          dishes: meal.dishes.map(d =>
            d.dishId.toString() === dishIdStr
              ? {
                  ...d,
                  myVote: value,
                  up: value === 1 ? d.up + (d.myVote !== 1 ? 1 : 0) - (d.myVote === 1 ? 1 : 0)
                    : value === -1 ? d.up - (d.myVote === 1 ? 1 : 0)
                    : d.up - (d.myVote === 1 ? 1 : 0),
                  total: value === 0 ? d.total - (d.myVote !== 0 ? 1 : 0) : d.total + (d.myVote === 0 ? 1 : 0)
                }
              : d
          )
        }))
      };
    });

    try {
      await api.put(`/votes/${dishIdStr}`, { value });
      // Refetch to get accurate counts and updated verdict
      load();
    } catch {
      // Rollback on error
      setData(prev);
    }
  }

  if (!data) {
    return (
      <div>
        <div className="page-header"><h1>Today's Menu</h1></div>
        {error
          ? <div className="error-banner">{error}</div>
          : <div className="spinner-wrap"><div className="spinner" /></div>
        }
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Today's Menu</h1>
        <span className="page-header__sub">{data.date}</span>
      </div>

      {data.meals.length === 0 ? (
        <div className="onboarding-empty">
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
          <h2>No menu today</h2>
          <p>No slots scheduled for today.</p>
        </div>
      ) : (
        <div className="fade-up">
          {data.meals.map(meal => (
            <MealCard key={meal.meal} mealData={meal} onVote={handleVote} />
          ))}
        </div>
      )}
    </div>
  );
}
