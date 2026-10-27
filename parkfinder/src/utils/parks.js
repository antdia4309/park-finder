// Activity definitions, scoring, and distance helpers for ParkFinder.

export const ACTIVITIES = [
  {
    id: 'kids',
    label: 'Kids',
    hint: 'Playgrounds',
    color: '#D9622B',
    score: (p) => {
      const f = p.features;
      if (!f.playground) return 0;
      return Math.min(1, 0.6 + 0.15 * (f.playground - 1) + (f.toilets ? 0.15 : 0) + (f.water ? 0.1 : 0));
    },
    reason: (p) => plural(p.features.playground, 'playground'),
  },
  {
    id: 'dogs',
    label: 'Dogs',
    hint: 'Dog parks',
    color: '#8A5A2B',
    score: (p) => {
      const f = p.features;
      if (f.dogPark) return Math.min(1, 0.7 + (f.water ? 0.15 : 0) + (p.trailMiles >= 0.5 ? 0.15 : 0));
      if (['yes', 'leashed'].includes(p.dogsAllowed)) return 0.35;
      return 0;
    },
    reason: (p) => (p.features.dogPark ? 'Dog park' : 'Dogs allowed on leash'),
  },
  {
    id: 'walking',
    label: 'Walking',
    hint: 'Trails and paths',
    color: '#2E6E8E',
    score: (p) => (p.trailMiles >= 0.25 ? Math.max(0.2, Math.min(1, p.trailMiles / 3)) : 0),
    reason: (p) => `${p.trailMiles.toFixed(1)} mi of paths`,
  },
  {
    id: 'picnic',
    label: 'Picnic',
    hint: 'Tables, grills, shelters',
    color: '#5E8C31',
    score: (p) => {
      const f = p.features;
      if (!f.picnic && !f.bbq && !f.shelter) return 0;
      return Math.min(1, 0.5 + 0.1 * f.picnic + (f.bbq ? 0.2 : 0) + (f.shelter ? 0.2 : 0));
    },
    reason: (p) => {
      const f = p.features;
      const parts = [];
      if (f.picnic) parts.push('picnic tables');
      if (f.bbq) parts.push('grills');
      if (f.shelter) parts.push('shelters');
      return capitalize(parts.join(', '));
    },
  },
  {
    id: 'sports',
    label: 'Sports',
    hint: 'Fields and courts',
    color: '#71489A',
    score: (p) => (p.features.pitch ? Math.min(1, 0.5 + 0.15 * p.features.pitch) : 0),
    reason: (p) => plural(p.features.pitch, 'field or court', 'fields and courts'),
  },
];

export const ACTIVITY_BY_ID = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a]));

// Activities a park is good for, strongest first.
export function strengths(park) {
  return ACTIVITIES.map((a) => ({ activity: a, score: a.score(park) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

// Filter and rank parks for the chosen activities, search text, and location.
export function rankParks(parks, { selected, query, userLocation }) {
  const text = query.trim().toLowerCase();

  return parks
    .filter((p) => !text || p.name.toLowerCase().includes(text))
    .map((p) => {
      const scores = selected.map((id) => ACTIVITY_BY_ID[id].score(p));
      const match = selected.length ? scores.reduce((sum, s) => sum + s, 0) / scores.length : null;
      const distance = userLocation ? milesBetween(userLocation, p) : null;
      const top = strengths(p)[0];
      // Marker color: the strongest selected activity, else the park's strongest overall.
      const lead = selected.length
        ? ACTIVITY_BY_ID[selected[scores.indexOf(Math.max(...scores))]]
        : top?.activity;
      return { ...p, match, distance, color: lead?.color || '#6B7A6F', fits: scores.every((s) => s > 0) };
    })
    .filter((p) => p.fits)
    .sort((a, b) => {
      if (a.match !== null && b.match !== a.match) return b.match - a.match;
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
      return a.name.localeCompare(b.name);
    });
}

export function milesBetween(a, b) {
  const R = 3958.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatMiles(miles) {
  if (miles === null || miles === undefined) return '';
  return miles < 0.1 ? 'Under 0.1 mi' : `${miles.toFixed(1)} mi away`;
}

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many || `${one}s`}`;
}

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
