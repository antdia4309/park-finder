// Today's weather in Richmond from Open-Meteo (free, no key), turned into a suggestion.
const RICHMOND = { lat: 37.54, lon: -77.44 };

export async function fetchWeather({ lat, lon } = RICHMOND) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m',
    daily: 'precipitation_sum',
    past_days: 1,
    forecast_days: 1,
    temperature_unit: 'fahrenheit',
    precipitation_unit: 'inch',
    timezone: 'America/New_York',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Weather unavailable (${res.status})`);
  const data = await res.json();
  return {
    temp: Math.round(data.current.temperature_2m),
    rain: data.daily.precipitation_sum.reduce((sum, n) => sum + (n || 0), 0),
  };
}

// Returns a nudge to show, or null when the weather isn't worth mentioning.
export function weatherNudge({ temp, rain }) {
  if (temp >= 88) {
    return {
      kind: 'hot',
      text: `It's ${temp}° out. Splash pads and pools might be the move.`,
      action: { label: 'Show water spots', activity: 'water' },
    };
  }
  if (rain >= 0.5) {
    return {
      kind: 'rain',
      text: `About ${rain.toFixed(1)} in. of rain since yesterday, so dirt trails may be muddy. Paved paths will be easier going.`,
      action: { label: 'Show paved paths', activity: 'access' },
    };
  }
  return null;
}
