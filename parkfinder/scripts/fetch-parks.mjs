// Pulls Richmond-area park data from OpenStreetMap (Overpass API),
// works out what each park offers, and writes a small snapshot to
// src/data/parks.json for the app to load.
//
// Run with: npm run fetch-parks   (Node 18+)
// Rebuild from a saved Overpass response instead: npm run fetch-parks -- --from raw.json

import { readFile, writeFile } from 'node:fs/promises';

// Richmond metro area, split into tiles so each request stays light.
const AREA = { south: 37.43, west: -77.62, north: 37.66, east: -77.33 };
const ROWS = 2;
const COLS = 3;

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const OUTPUT = new URL('../src/data/parks.json', import.meta.url);

function buildQuery({ south, west, north, east }) {
  const bbox = `${south},${west},${north},${east}`;
  return `[out:json][timeout:120];
(
  way["leisure"~"^(park|dog_park|nature_reserve)$"]["name"](${bbox});
  relation["leisure"~"^(park|dog_park|nature_reserve)$"]["name"](${bbox});
)->.parks;
.parks out tags bb;
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
    await sleep(10_000 * (attempt + 1));
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

const bboxArea = (b) => (b.maxlat - b.minlat) * (b.maxlon - b.minlon);
const contains = (b, p) =>
  p.lat >= b.minlat && p.lat <= b.maxlat && p.lon >= b.minlon && p.lon <= b.maxlon;

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
  const latStep = (AREA.north - AREA.south) / ROWS;
  const lonStep = (AREA.east - AREA.west) / COLS;

  const parks = new Map();
  const amenities = new Map();
  const trails = new Map();

  const fromIndex = process.argv.indexOf('--from');
  const tiles = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) tiles.push([r, c]);
  }

  const collect = (elements) => {
    for (const el of elements) {
      const tags = el.tags || {};
      const key = `${el.type}/${el.id}`;
      if (el.bounds && ['park', 'dog_park', 'nature_reserve'].includes(tags.leisure) && tags.name) {
        parks.set(key, el);
      } else if (tags.highway && el.geometry) {
        trails.set(key, el);
      } else {
        const point = el.center || (el.lat != null ? { lat: el.lat, lon: el.lon } : null);
        const feature = featureKey(tags);
        if (point && feature) amenities.set(key, { ...point, feature, tags });
      }
    }
  };

  if (fromIndex !== -1) {
    const file = process.argv[fromIndex + 1];
    console.log(`Reading saved Overpass response from ${file}...`);
    collect(JSON.parse(await readFile(file, 'utf8')).elements);
  } else for (const [r, c] of tiles) {
    {
      const tile = {
        south: +(AREA.south + r * latStep).toFixed(4),
        north: +(AREA.south + (r + 1) * latStep).toFixed(4),
        west: +(AREA.west + c * lonStep).toFixed(4),
        east: +(AREA.west + (c + 1) * lonStep).toFixed(4),
      };
      console.log(`Fetching tile ${r * COLS + c + 1} of ${ROWS * COLS}...`);
      collect(await runQuery(buildQuery(tile)));
      await sleep(2_000);
    }
  }

  // Build a summary for every park.
  const summaries = new Map();
  for (const [key, el] of parks) {
    const b = el.bounds;
    summaries.set(key, {
      id: key,
      name: el.tags.name,
      kind: el.tags.leisure,
      lat: +((b.minlat + b.maxlat) / 2).toFixed(6),
      lon: +((b.minlon + b.maxlon) / 2).toFixed(6),
      bounds: [[b.minlat, b.minlon], [b.maxlat, b.maxlon]],
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
    });
  }

  // Assign each point to the smallest park whose bounding box contains it.
  const parkList = [...parks.entries()].sort((a, b) => bboxArea(a[1].bounds) - bboxArea(b[1].bounds));
  const owner = (point) => {
    const hit = parkList.find(([, el]) => contains(el.bounds, point));
    return hit ? summaries.get(hit[0]) : null;
  };

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

  const output = [...summaries.values()]
    .map((p) => ({ ...p, trailMiles: +p.trailMiles.toFixed(2) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  await writeFile(
    OUTPUT,
    JSON.stringify({ generatedAt: new Date().toISOString(), source: 'OpenStreetMap contributors', parks: output })
  );
  console.log(`Saved ${output.length} parks to src/data/parks.json`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
