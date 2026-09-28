const BASE = '/api';

async function apiFetch(path, { method = 'GET', body } = {}) {
  const opts = {
    method,
    credentials: 'include',
    cache: 'no-store',
    headers: {}
  };

  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${path}`, opts);

  if (res.status === 204) return null;

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return data;
}

export const api = {
  get:    (path)        => apiFetch(path),
  post:   (path, body)  => apiFetch(path, { method: 'POST', body }),
  put:    (path, body)  => apiFetch(path, { method: 'PUT', body }),
  delete: (path)        => apiFetch(path, { method: 'DELETE' }),
};
