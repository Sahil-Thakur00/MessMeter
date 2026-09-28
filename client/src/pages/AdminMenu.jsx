import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MEALS = ['breakfast', 'lunch', 'snacks', 'dinner'];

const MEAL_META = {
  breakfast: { icon: '🍳', label: 'Breakfast' },
  lunch: { icon: '🍛', label: 'Lunch' },
  snacks: { icon: '☕', label: 'Snacks' },
  dinner: { icon: '🍲', label: 'Dinner' }
};

function DishChip({ name, onRemove }) {
  return (
    <span className="dish-chip" title={name}>
      <span className="dish-chip__name">{name}</span>
      <button
        type="button"
        className="dish-chip__remove"
        onClick={onRemove}
        aria-label={`Remove ${name}`}
      >
        ×
      </button>
    </span>
  );
}

function CellInput({ weekday, meal, dishes, onChange, isToday }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const debounceRef = useRef(null);

  async function fetchSuggestions(q) {
    if (!q.trim()) { setSuggestions([]); return; }
    try {
      const data = await api.get(`/admin/dishes/suggest?q=${encodeURIComponent(q)}`);
      setSuggestions(data.filter(s => !dishes.includes(s.name)));
    } catch {
      setSuggestions([]);
    }
  }

  function handleInput(e) {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(q), 200);
  }

  function addDish(name) {
    if (name.trim() && !dishes.includes(name.trim())) {
      onChange([...dishes, name.trim()]);
    }
    setQuery('');
    setSuggestions([]);
  }

  function handleBlur() {
    setTimeout(() => {
      if (query.trim()) {
        addDish(query.trim());
      } else {
        setSuggestions([]);
      }
    }, 150);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      addDish(query.trim());
    }
  }

  function removeDish(name) {
    onChange(dishes.filter(d => d !== name));
  }

  return (
    <div className={`admin-cell ${isToday ? 'admin-cell--today' : ''}`}>
      <div className="admin-cell__day-header">
        <span className={`admin-cell__day ${isToday ? 'today' : ''}`}>{DAYS[weekday].slice(0, 3)}</span>
        {isToday && <span className="today-chip">★ Today</span>}
      </div>
      <div className="admin-cell__chips">
        {dishes.map(name => (
          <DishChip key={name} name={name} onRemove={() => removeDish(name)} />
        ))}
      </div>
      <div className="suggest-wrap">
        <input
          id={`cell-${weekday}-${meal}`}
          className="cell-input"
          placeholder="+ Add dish…"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          autoComplete="off"
        />
        {suggestions.length > 0 && (
          <div className="suggest-list">
            {suggestions.map(s => (
              <div
                key={s.dishId}
                className="suggest-item"
                onMouseDown={() => addDish(s.name)}
              >
                {s.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminMenu() {
  const currentWeekday = new Date().getDay(); // 0 = Sun, 1 = Mon, etc.
  // grid[weekday][meal] = [dishName, ...]
  const [grid, setGrid] = useState(() => {
    const g = {};
    for (let w = 0; w < 7; w++) {
      g[w] = {};
      for (const m of MEALS) g[w][m] = [];
    }
    return g;
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/menu')
      .then(data => {
        if (!data?.slots) return;
        const g = {};
        for (let w = 0; w < 7; w++) {
          g[w] = {};
          for (const m of MEALS) g[w][m] = [];
        }
        for (const slot of data.slots) {
          if (g[slot.weekday]) {
            g[slot.weekday][slot.meal] = slot.dishes?.map(d => d.name) || [];
          }
        }
        setGrid(g);
      })
      .catch(() => {}) // ignore, start with empty grid
      .finally(() => setLoading(false));
  }, []);

  function updateCell(weekday, meal, names) {
    setGrid(prev => ({
      ...prev,
      [weekday]: { ...prev[weekday], [meal]: names }
    }));
  }

  async function handleSave() {
    setError('');
    setSuccess('');
    setSaving(true);
    const slots = [];
    for (let w = 0; w < 7; w++) {
      for (const meal of MEALS) {
        const dishNames = grid[w][meal];
        if (dishNames.length > 0) {
          slots.push({ weekday: w, meal, dishNames });
        }
      }
    }

    if (slots.length === 0) {
      setError('Please add at least one dish before saving.');
      setSaving(false);
      return;
    }

    try {
      const res = await api.post('/admin/menu', { slots });
      const totalDishes = slots.reduce((acc, s) => acc + s.dishNames.length, 0);
      const newDishesMsg = res.newDishesCreated > 0
        ? ` (${res.newDishesCreated} new catalog item${res.newDishesCreated > 1 ? 's' : ''} added)`
        : '';
      setSuccess(`Saved successfully! Weekly menu published with ${totalDishes} dishes across ${slots.length} meals${newDishesMsg}.`);
    } catch (err) {
      setError(err.message || 'Failed to save menu.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1>Menu Manager</h1></div>
        <div className="spinner-wrap"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="admin-menu-page fade-up">
      <div style={{ marginBottom: 12 }}>
        <Link to="/today" id="btn-back-today" className="back-link">
          ← Back to Today's Menu
        </Link>
      </div>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1>Menu Manager</h1>
          <span className="page-header__sub">Edit and customize the 7-day schedule</span>
        </div>
        <Link
          to="/admin/report"
          id="btn-goto-report"
          className="btn btn-ghost"
          style={{ width: 'auto', padding: '8px 16px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
        >
          📊 Disliked Dishes Report →
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 20 }}>
        Type a dish name and press <kbd style={{ background: 'var(--bg-card-2)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border-mid)', color: 'var(--text-2)' }}>Enter</kbd>, or choose from suggestions. Click Save at the bottom to publish.
      </p>

      {MEALS.map(meal => {
        const meta = MEAL_META[meal] || { icon: '🍽️', label: meal };
        const totalCount = Array.from({ length: 7 }, (_, w) => grid[w]?.[meal]?.length || 0).reduce((a, b) => a + b, 0);

        return (
          <div key={meal} className="admin-meal-section">
            <div className="admin-meal-header">
              <div className="admin-meal-header__title">
                <span className="admin-meal-header__icon">{meta.icon}</span>
                <h2>{meta.label}</h2>
              </div>
              <span className="admin-meal-header__badge">{totalCount} dishes planned</span>
            </div>

            <div className="admin-grid">
              {Array.from({ length: 7 }, (_, w) => (
                <CellInput
                  key={w}
                  weekday={w}
                  meal={meal}
                  dishes={grid[w][meal]}
                  onChange={(names) => updateCell(w, meal, names)}
                  isToday={w === currentWeekday}
                />
              ))}
            </div>
          </div>
        );
      })}

      <div className="admin-actions-bar">
        <button
          id="btn-save-menu"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ maxWidth: 320, padding: '14px 28px', fontSize: '0.95rem' }}
        >
          {saving ? 'Saving changes…' : '💾 Save New Menu Version'}
        </button>
      </div>
    </div>
  );
}
