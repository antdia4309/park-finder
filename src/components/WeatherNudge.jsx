import { useEffect, useState } from 'react';
import { fetchWeather, weatherNudge } from '../utils/weather';
import './WeatherNudge.css';

const DISMISSED = 'parkfinder:weather-dismissed';

function WeatherNudge({ onPick }) {
  const [nudge, setNudge] = useState(null);

  useEffect(() => {
    let cancelled = false;
    try {
      if (window.sessionStorage.getItem(DISMISSED)) return undefined;
    } catch {
      // Ignore blocked storage.
    }
    if (typeof window.fetch !== 'function') return undefined;
    fetchWeather()
      .then((w) => !cancelled && setNudge(weatherNudge(w)))
      .catch(() => {}); // No weather, no nudge.
    return () => {
      cancelled = true;
    };
  }, []);

  if (!nudge) return null;

  const dismiss = () => {
    setNudge(null);
    try {
      window.sessionStorage.setItem(DISMISSED, '1');
    } catch {
      // Ignore blocked storage.
    }
  };

  return (
    <aside className={`weather-nudge is-${nudge.kind}`} role="status">
      <p>{nudge.text}</p>
      <div className="weather-actions">
        <button type="button" onClick={() => onPick(nudge.action.activity)}>{nudge.action.label}</button>
        <button type="button" className="dismiss" onClick={dismiss} aria-label="Dismiss weather tip">Dismiss</button>
      </div>
    </aside>
  );
}

export default WeatherNudge;
