import { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MEALS = ['breakfast', 'lunch', 'snacks', 'dinner'];

function DishChip({ name, onRemove }) {
  return (
    <span className="dish-chip" title={name}>
      {name.length > 16 ? name.slice(0, 14) + '…' : name}
      <span
        className="dish-chip__remove"
        onClick={onRemove}
        aria-label={`Remove ${name}`}
      >
        ×
      </span>
    </span>
  );
}

function CellInput({ weekday, meal, dishes, onChange }) {
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
    <div className="admin-cell">
      <div className="admin-cell__day">{DAYS[weekday].slice(0, 3)}</div>
      {dishes.map(name => (
        <DishChip key={name} name={name} onRemove={() => removeDish(name)} />
      ))}
      <div className="suggest-wrap">
        <input
          id={`cell-${weekday}-${meal}`}
          className="cell-input"
          placeholder="+ Add dish"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
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
      setSuccess(`Saved! Menu version created. ${res.newDishesCreated} new dishes added.`);
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
    <div>
      <div className="page-header">
        <h1>Menu Manager</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 14 }}>
        Type a dish name and press Enter, or pick from suggestions. Each save creates a new version.
      </p>

      {MEALS.map(meal => (
        <div key={meal} style={{ marginBottom: 20 }}>
          <div className="lb-section-title">{meal}</div>
          <div className="admin-grid">
            {Array.from({ length: 7 }, (_, w) => (
              <CellInput
                key={w}
                weekday={w}
                meal={meal}
                dishes={grid[w][meal]}
                onChange={(names) => updateCell(w, meal, names)}
              />
            ))}
          </div>
        </div>
      ))}

      <button
        id="btn-save-menu"
        className="btn btn-primary"
        onClick={handleSave}
        disabled={saving}
        style={{ marginTop: 8 }}
      >
        {saving ? 'Saving…' : 'Save New Menu Version'}
      </button>
    </div>
  );
}
