import { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';

const VERDICT_LABEL = {
  go: 'Go for it',
  meh: 'Meh',
  skip: 'Skip it',
  insufficient: 'Not enough data'
};

const VERDICT_ICON = {
  go: '✓',
  meh: '~',
  skip: '✕',
  insufficient: '?'
};

function VerdictBadge({ verdict }) {
  const cls = verdict === 'insufficient' ? 'insufficient' : verdict;
  return (
    <span className={`verdict-badge ${cls}`} aria-label={`Verdict: ${VERDICT_LABEL[verdict]}`}>
      <span>{VERDICT_ICON[verdict]}</span>
      {VERDICT_LABEL[verdict] || verdict}
    </span>
  );
}

function DishRow({ dish, onVote }) {
  const { dishId, name, up, total, myVote } = dish;
  const idStr = dishId?.toString() ?? '';
  const pct = total > 0 ? Math.round((up / total) * 100) : null;

  return (
    <div className="dish-row">
      <div className="dish-row__left">
        <div className="dish-row__name">{name}</div>
        <div className="dish-row__meta">
          {pct !== null ? `${pct}% approval · ${total} vote${total !== 1 ? 's' : ''}` : 'No votes yet'}
        </div>
        {pct !== null && (
          <div className="dish-approval-bar">
            <div className="dish-approval-bar__fill" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      <div className="vote-btns">
        <button
          id={`vote-up-${idStr}`}
          className={`vote-btn up${myVote === 1 ? ' active' : ''}`}
          onClick={() => onVote(idStr, myVote === 1 ? 0 : 1)}
          aria-label={`Thumbs up for ${name}`}
          aria-pressed={myVote === 1}
        >
          👍
        </button>
        <button
          id={`vote-down-${idStr}`}
          className={`vote-btn down${myVote === -1 ? ' active' : ''}`}
          onClick={() => onVote(idStr, myVote === -1 ? 0 : -1)}
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
        <div className="meal-card__skip-strip">
          <span>⚠</span>
          <span>{dragDish} is rated poorly</span>
        </div>
      )}
      {dishes.map(dish => (
        <DishRow key={dish.dishId?.toString()} dish={dish} onVote={onVote} />
      ))}
    </div>
  );
}

export default function Today() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/today');
      setData(res);
    } catch {
      setError("Failed to load today's menu.");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleVote(dishId, value) {
    const dishIdStr = dishId.toString();
    const prev = data;

    // Optimistic update
    setData(old => {
      if (!old) return old;
      return {
        ...old,
        meals: old.meals.map(meal => ({
          ...meal,
          dishes: meal.dishes.map(d => {
            if (d.dishId?.toString() !== dishIdStr) return d;
            const wasUp = d.myVote === 1;
            const wasDown = d.myVote === -1;
            const wasVoted = d.myVote !== 0;
            let newUp = d.up;
            let newTotal = d.total;
            if (value === 0) {
              if (wasUp) newUp--;
              if (wasVoted) newTotal--;
            } else if (value === 1) {
              if (!wasUp) { newUp++; if (!wasVoted) newTotal++; }
              if (wasDown) { /* total stays */ }
            } else {
              if (wasUp) newUp--;
              if (!wasVoted) newTotal++;
            }
            return { ...d, myVote: value, up: Math.max(0, newUp), total: Math.max(0, newTotal) };
          })
        }))
      };
    });

    try {
      await api.put(`/votes/${dishIdStr}`, { value });
      load(); // refetch for accurate verdict
    } catch {
      setData(prev);
    }
  }

  if (!data) {
    return (
      <div>
        <div className="page-header"><h1>Today's Menu</h1></div>
        {error
          ? <div className="error-banner">{error}</div>
          : <div className="spinner-wrap"><div className="spinner" /></div>}
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
        <div className="empty-state fade-up">
          <div className="empty-state__icon">📭</div>
          <h2>No menu today</h2>
          <p>No slots are scheduled for today.</p>
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
