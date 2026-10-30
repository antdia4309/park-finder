// Pulls Richmond-area park data from OpenStreetMap (Overpass API),
// works out what each park offers, and writes a small snapshot to
// src/data/parks.json for the app to load.
//
// Run with: npm run fetch-parks   (Node 18+)
// Rebuild from a saved Overpass response instead: npm run fetch-parks -- --from raw.json

import { readFile, writeFile } from 'node:fs/promises';

// Richmond metro area, split into tiles so each request stays light.
const AREA = { south: 37.43, west: -77.62, north: 37.66, east: -77.33 };
const ROWS = 4;
const COLS = 6;

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const OUTPUT = new URL('../src/data/parks.json', import.meta.url);

const PARK_KINDS = ['park', 'dog_park', 'nature_reserve'];

// Outline simplification tolerance in degrees (about 5 meters).
const SIMPLIFY = 0.00005;

function buildQuery({ south, west, north, east }) {
  const bbox = `${south},${west},${north},${east}`;
  return `[out:json][timeout:120];
(
  way["leisure"~"^(park|dog_park|nature_reserve)$"]["name"](${bbox});
  relation["leisure"~"^(park|dog_park|nature_reserve)$"]["name"](${bbox});
)->.parks;
.parks out tags geom;
.parks map_to_area->.pa;
(
  nwr["leisure"~"^(playground|dog_park|pitch|picnic_table|picnic_site|fitness_station|swimming_pool)$"](area.pa);
  nwr["amenity"~"^(toilets|drinking_water|bbq|shelter)$"](area.pa);
  nwr["tourism"="picnic_site"](area.pa);
);
out tags center;
way["highway"~"^(footway|path|track|cycleway|pedestrian|bridleway)$"](area.pa);
out tags geom;`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runQuery(query) {
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'ParkFinder/1.0 (student portfolio project)',
          },
          body: 'data=' + encodeURIComponent(query),
          signal: AbortSignal.timeout(150_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()).elements;
      } catch (err) {
        console.warn(`  ${new URL(url).host} failed: ${err.message}`);
      }
    }
    await sleep(15_000 * (attempt + 1));
  }
  throw new Error('All Overpass endpoints failed. Try again in a few minutes.');
}

// Distance between two points in miles.
function haversineMiles(a, b) {
  const R = 3958.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function pathMiles(geometry = []) {
  let total = 0;
  for (let i = 1; i < geometry.length; i++) total += haversineMiles(geometry[i - 1], geometry[i]);
  return total;
}

const samePoint = (a, b) => a.lat === b.lat && a.lon === b.lon;

// Joins open way segments end to end into closed rings (multipolygon members are often split).
function stitchRings(segments) {
  const pending = segments.filter((s) => s.length > 1).map((s) => [...s]);
  const rings = [];
  while (pending.length) {
    let ring = pending.shift();
    let extended = true;
    while (!samePoint(ring[0], ring[ring.length - 1]) && extended) {
      extended = false;
      for (let i = 0; i < pending.length; i++) {
        const seg = pending[i];
        const end = ring[ring.length - 1];
        if (samePoint(seg[0], end)) ring = ring.concat(seg.slice(1));
        else if (samePoint(seg[seg.length - 1], end)) ring = ring.concat([...seg].reverse().slice(1));
        else continue;
        pending.splice(i, 1);
        extended = true;
        break;
      }
    }
    if (ring.length >= 4 && samePoint(ring[0], ring[ring.length - 1])) rings.push(ring);
  }
  return rings;
}

function pointInRing(p, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (a.lat > p.lat !== b.lat > p.lat && p.lon < ((b.lon - a.lon) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lon) {
      inside = !inside;
    }
  }
  return inside;
}

// polygons: [{ outer: ring, holes: [ring] }]
const pointInPolygons = (p, polygons) =>
  polygons.some((poly) => pointInRing(p, poly.outer) && !poly.holes.some((h) => pointInRing(p, h)));

function ringArea(ring) {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j].lon + ring[i].lon) * (ring[j].lat - ring[i].lat);
  }
  return Math.abs(sum / 2);
}

function ringCentroid(ring) {
  let a = 0;
  let x = 0;
  let y = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j].lon * ring[i].lat - ring[i].lon * ring[j].lat;
    a += f;
    x += (ring[j].lon + ring[i].lon) * f;
    y += (ring[j].lat + ring[i].lat) * f;
  }
  if (!a) return ring[0];
  return { lat: y / (3 * a), lon: x / (3 * a) };
}

// A spot guaranteed to be inside the park, so markers never land outside odd shapes.
function labelPoint(polygons) {
  const main = polygons.reduce((best, p) => (ringArea(p.outer) > ringArea(best.outer) ? p : best));
  const c = ringCentroid(main.outer);
  if (pointInPolygons(c, [main])) return c;

  const lats = main.outer.map((p) => p.lat);
  const lons = main.outer.map((p) => p.lon);
  const [minLat, maxLat, minLon, maxLon] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  let best = null;
  let bestDist = Infinity;
  const steps = 24;
  for (let i = 1; i < steps; i++) {
    for (let j = 1; j < steps; j++) {
      const p = { lat: minLat + ((maxLat - minLat) * i) / steps, lon: minLon + ((maxLon - minLon) * j) / steps };
      if (!pointInPolygons(p, [main])) continue;
      const d = (p.lat - c.lat) ** 2 + (p.lon - c.lon) ** 2;
      if (d < bestDist) {
        best = p;
        bestDist = d;
      }
    }
  }
  return best || main.outer[0];
}

// Douglas-Peucker simplification to keep outlines small.
function simplify(points, tolerance) {
  if (points.length <= 4) return points;
  const sqTol = tolerance * tolerance;
  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxSq = 0;
    let index = 0;
    for (let i = first + 1; i < last; i++) {
      const sq = segmentSqDist(points[i], points[first], points[last]);
      if (sq > maxSq) {
        maxSq = sq;
        index = i;
      }
    }
    if (maxSq > sqTol) {
      keep[index] = true;
      stack.push([first, index], [index, last]);
    }
  }
  const out = points.filter((_, i) => keep[i]);
  return out.length >= 4 ? out : points;
}

function segmentSqDist(p, a, b) {
  let x = a.lon;
  let y = a.lat;
  let dx = b.lon - x;
  let dy = b.lat - y;
  if (dx || dy) {
    const t = ((p.lon - x) * dx + (p.lat - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b.lon;
      y = b.lat;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = p.lon - x;
  dy = p.lat - y;
  return dx * dx + dy * dy;
}

// Turns an Overpass park element (out geom) into polygons, or null if it has no usable shape.
function parkPolygons(el) {
  if (el.type === 'way' && el.geometry) {
    const rings = stitchRings([el.geometry]);
    return rings.length ? [{ outer: rings[0], holes: [] }] : null;
  }
  if (el.type === 'relation' && el.members) {
    const outers = stitchRings(el.members.filter((m) => m.role !== 'inner' && m.geometry).map((m) => m.geometry));
    const inners = stitchRings(el.members.filter((m) => m.role === 'inner' && m.geometry).map((m) => m.geometry));
    if (!outers.length) return null;
    return outers.map((outer) => ({
      outer,
      holes: inners.filter((h) => pointInRing(h[0], outer)),
    }));
  }
  return null;
}

// Rectangle fallback for parks without a usable outline.
function boundsPolygon(b) {
  const ring = [
    { lat: b.minlat, lon: b.minlon },
    { lat: b.minlat, lon: b.maxlon },
    { lat: b.maxlat, lon: b.maxlon },
    { lat: b.maxlat, lon: b.minlon },
    { lat: b.minlat, lon: b.minlon },
  ];
  return [{ outer: ring, holes: [] }];
}

const round = (n) => Math.round(n * 1e5) / 1e5;
const toLatLngs = (ring) => ring.map((p) => [round(p.lat), round(p.lon)]);

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Which feature bucket an amenity belongs to.
function featureKey(tags) {
  if (tags.leisure === 'playground') return 'playground';
  if (tags.leisure === 'dog_park') return 'dogPark';
  if (tags.leisure === 'pitch') return 'pitch';
  if (tags.leisure === 'fitness_station') return 'fitness';
  if (tags.leisure === 'swimming_pool') return 'pool';
  if (tags.leisure === 'picnic_table' || tags.leisure === 'picnic_site' || tags.tourism === 'picnic_site') return 'picnic';
  if (tags.amenity === 'bbq') return 'bbq';
  if (tags.amenity === 'shelter') return 'shelter';
  if (tags.amenity === 'toilets') return 'toilets';
  if (tags.amenity === 'drinking_water') return 'water';
  return null;
}

async function main() {
  const parks = new Map();
  const amenities = new Map();
  const trails = new Map();

  const collect = (elements) => {
    for (const el of elements) {
      const tags = el.tags || {};
      const key = `${el.type}/${el.id}`;
      if (PARK_KINDS.includes(tags.leisure) && tags.name && (el.bounds || el.geometry || el.members)) {
        // Keep whichever copy has the most geometry (tiles can return the same park).
        const prev = parks.get(key);
        if (!prev || JSON.stringify(el).length > JSON.stringify(prev).length) parks.set(key, el);
      } else if (tags.highway && el.geometry) {
        trails.set(key, el);
      } else {
        const point = el.center || (el.lat != null ? { lat: el.lat, lon: el.lon } : null);
        const feature = featureKey(tags);
        if (point && feature) amenities.set(key, { ...point, feature, tags });
      }
    }
  };

  const fromIndex = process.argv.indexOf('--from');
  if (fromIndex !== -1) {
    const file = process.argv[fromIndex + 1];
    console.log(`Reading saved Overpass response from ${file}...`);
    collect(JSON.parse(await readFile(file, 'utf8')).elements);
  } else {
    const latStep = (AREA.north - AREA.south) / ROWS;
    const lonStep = (AREA.east - AREA.west) / COLS;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = {
          south: +(AREA.south + r * latStep).toFixed(4),
          north: +(AREA.south + (r + 1) * latStep).toFixed(4),
          west: +(AREA.west + c * lonStep).toFixed(4),
          east: +(AREA.west + (c + 1) * lonStep).toFixed(4),
        };
        console.log(`Fetching tile ${r * COLS + c + 1} of ${ROWS * COLS}...`);
        collect(await runQuery(buildQuery(tile)));
        await sleep(3_000);
      }
    }
  }

  // Build a summary and shape for every park.
  const entries = [];
  for (const [key, el] of parks) {
    const polygons = parkPolygons(el) || (el.bounds ? boundsPolygon(el.bounds) : null);
    if (!polygons) continue;
    const hasOutline = Boolean(parkPolygons(el));
    const label = labelPoint(polygons);
    const all = polygons.flatMap((p) => p.outer);
    const lats = all.map((p) => p.lat);
    const lons = all.map((p) => p.lon);

    entries.push({
      polygons,
      area: polygons.reduce((sum, p) => sum + ringArea(p.outer), 0),
      summary: {
        id: key,
        slug: slugify(el.tags.name),
        name: el.tags.name,
        kind: el.tags.leisure,
        lat: round(label.lat),
        lon: round(label.lon),
        bounds: [[round(Math.min(...lats)), round(Math.min(...lons))], [round(Math.max(...lats)), round(Math.max(...lons))]],
        outline: hasOutline
          ? polygons.map((p) => [p.outer, ...p.holes].map((ring) => toLatLngs(simplify(ring, SIMPLIFY))))
          : null,
        features: {
          playground: 0, dogPark: el.tags.leisure === 'dog_park' ? 1 : 0, pitch: 0,
          picnic: 0, bbq: 0, shelter: 0, fitness: 0, pool: 0, toilets: 0, water: 0,
        },
        sports: [],
        trailMiles: 0,
        dogsAllowed: el.tags.dog || null,
        website: el.tags.website || el.tags['contact:website'] || null,
        hours: el.tags.opening_hours || null,
        operator: el.tags.operator || null,
      },
    });
  }

  // Assign each point to the smallest park that actually contains it.
  entries.sort((a, b) => a.area - b.area);
  const owner = (point) => entries.find((e) => pointInPolygons(point, e.polygons))?.summary || null;

  for (const a of amenities.values()) {
    const park = owner(a);
    if (!park) continue;
    park.features[a.feature] += 1;
    if (a.feature === 'pitch' && a.tags.sport) {
      for (const s of a.tags.sport.split(';')) if (!park.sports.includes(s)) park.sports.push(s);
    }
  }

  for (const t of trails.values()) {
    const mid = t.geometry[Math.floor(t.geometry.length / 2)];
    const park = owner(mid);
    if (park) park.trailMiles += pathMiles(t.geometry);
  }

  // Unique, readable slugs for shareable links.
  const output = entries
    .map((e) => ({ ...e.summary, trailMiles: +e.summary.trailMiles.toFixed(2) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const used = new Map();
  for (const p of output) {
    const n = (used.get(p.slug) || 0) + 1;
    used.set(p.slug, n);
    if (n > 1) p.slug = `${p.slug}-${n}`;
  }

  // Don't replace good data with a partial download.
  if (fromIndex === -1) {
    try {
      const previous = JSON.parse(await readFile(OUTPUT, 'utf8'));
      if (output.length < previous.parks.length * 0.8) {
        throw new Error(
          `Only got ${output.length} parks (had ${previous.parks.length}). Keeping the existing data.`
        );
      }
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  await writeFile(
    OUTPUT,
    JSON.stringify({ generatedAt: new Date().toISOString(), source: 'OpenStreetMap contributors', parks: output })
  );
  console.log(`Saved ${output.length} parks to src/data/parks.json`);
}