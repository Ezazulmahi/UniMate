import { useCallback, useEffect, useRef, useState } from 'react';

// Loads data from `loader` and re-runs when `deps` change.
export function useLoad(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loaderRef.current();
      setState({ data, error: null, loading: false });
    } catch (error) {
      setState((s) => ({ ...s, error, loading: false }));
    }
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload };
}

// Wraps an async action with busy and error state.
export function useSubmit(action) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const run = async (...args) => {
    setBusy(true);
    setError(null);
    try {
      return await action(...args);
    } catch (err) {
      setError(err);
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  return { run, busy, error, setError };
}

// Reads all named inputs of a form into a plain object.
export const formValues = (form) => Object.fromEntries(new FormData(form).entries());

export const formatDateTime = (value) =>
  new Date(value).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

export const formatDate = (value) =>
  new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

// "in 3 days", "in 5 hours", "2 days ago"
export function relativeTime(value, now = Date.now()) {
  const diff = new Date(value).getTime() - now;
  const abs = Math.abs(diff);
  const units = [
    ['day', 86400000],
    ['hour', 3600000],
    ['minute', 60000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === 'minute') {
      const n = Math.max(1, Math.round(abs / ms));
      const label = `${n} ${unit}${n === 1 ? '' : 's'}`;
      return diff >= 0 ? `in ${label}` : `${label} ago`;
    }
  }
  return '';
}

// Value for a <input type="datetime-local"> some hours from now.
export function localDateTimeInput(hoursFromNow = 1) {
  const d = new Date(Date.now() + hoursFromNow * 3600000);
  d.setMinutes(0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
