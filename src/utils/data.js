// Downloads the park data when the app starts. It lives in public/data/ rather
// than inside the app's code, so the page loads faster and a weekly data
// refresh doesn't change the app's JavaScript files.
import { useCallback, useEffect, useState } from 'react';

// BASE_URL is "/park-finder/" on GitHub Pages, so this works in dev and production.
export const DATA_URL = `${import.meta.env.BASE_URL}data/parks.json`;

export async function loadParks() {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Park data unavailable (${res.status})`);
  return res.json();
}

// { status: 'loading' | 'ready' | 'error', data, retry }
export function useParkData() {
  const [state, setState] = useState({ status: 'loading', data: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadParks()
      .then((data) => !cancelled && setState({ status: 'ready', data }))
      .catch(() => !cancelled && setState({ status: 'error', data: null }));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Show "loading" again, then try one more time.
  const retry = useCallback(() => {
    setState({ status: 'loading', data: null });
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, retry };
}
