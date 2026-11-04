// Saved parks, kept in this browser only (no account needed).
import { useCallback, useEffect, useState } from 'react';

const KEY = 'parkfinder:favorites';

function load() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return []; // Private browsing or blocked storage: start empty.
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState(load);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(favorites));
    } catch {
      // Storage unavailable; favorites last for this visit only.
    }
  }, [favorites]);

  const toggleFavorite = useCallback(
    (slug) => setFavorites((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug])),
    []
  );

  return { favorites, toggleFavorite };
}
