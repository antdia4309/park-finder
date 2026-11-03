// Builds src/data/parks.json from the GeoJSON that scripts/fetch-parks.sh exports.
// Works out what each park offers using its real outline.
//
// Usage: node scripts/build-parks.mjs .osm-cache/richmond.geojsonseq

import { readFile, writeFile } from 'node:fs/promises';

const OUTPUT = new URL('../src/data/parks.json', import.meta.url);
const PARK_KINDS = ['park', 'dog_park', 'nature_reserve'];
const TRAIL_TYPES = ['footway', 'path', 'track', 'cycleway', 'pedestrian', 'bridleway'];

// Outline simplification tolerance in degrees (about 5 meters).
const SIMPLIFY = 0.00005;

// ---------- Geometry helpers. Points are { lat, lon }. ----------

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

// GeoJSON stores [lon, lat]; the helpers above use { lat, lon }.
const toPoint = ([lon, lat]) => ({ lat, lon });
const toRing = (coords) => coords.map(toPoint);

// A Polygon or MultiPolygon as [{ outer, holes }].
function toPolygons(geometry) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polys.map(([outer, ...holes]) => ({ outer: toRing(outer), holes: holes.map(toRing) }));
}

// osmium gives areas ids like "a246"; even numbers are ways, odd are relations.
function osmId(featureId) {
  const kind = featureId[0];
  const n = Number(featureId.slice(1));
  if (kind === 'n') return `node/${n}`;
  if (kind === 'w') return `way/${n}`;
  if (kind === 'r') return `relation/${n}`;
  return n % 2 === 0 ? `way/${n / 2}` : `relation/${(n - 1) / 2}`;
}

// Which feature bucket an amenity belongs to.
function featureKey(tags) {
  if (tags.playground === 'splash_pad' || tags.leisure === 'splash_pad') return 'splashPad';
  if (tags.leisure === 'playground') return 'playground';
  if (tags.leisure === 'dog_park') return 'dogPark';
  if (tags.leisure === 'pitch') return 'pitch';
  if (tags.leisure === 'fitness_station') return 'fitness';
  if (tags.leisure === 'swimming_pool' || tags.leisure === 'swimming_area') return 'pool';
  if (tags.leisure === 'fishing') return 'fishing';
  if (tags.leisure === 'slipway' || tags.canoe === 'put_in' || tags.whitewater === 'put_in') return 'boatLaunch';
  if (tags.leisure === 'picnic_table' || tags.leisure === 'picnic_site' || tags.tourism === 'picnic_site') return 'picnic';
  if (tags.amenity === 'bbq') return 'bbq';
  if (tags.amenity === 'shelter') return 'shelter';
  if (tags.amenity === 'toilets') return 'toilets';
  if (tags.amenity === 'drinking_water') return 'water';
  return null;
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: node scripts/build-parks.mjs <file.geojsonseq>');

  const parks = [];
  const amenities = [];
  const trails = [];

  // One GeoJSON feature per line, sometimes prefixed with a record separator.
  const lines = (await readFile(file, 'utf8')).split('\n');
  for (const line of lines) {
    const text = line.replace(/^\x1e/, '').trim();
    if (!text) continue;
    const f = JSON.parse(text);
    const tags = f.properties || {};
    const type = f.geometry.type;
    const isArea = type === 'Polygon' || type === 'MultiPolygon';

    if (PARK_KINDS.includes(tags.leisure) && tags.name && isArea) {
      parks.push({ id: osmId(f.id), tags, polygons: toPolygons(f.geometry) });
    } else if (TRAIL_TYPES.includes(tags.highway) && type === 'LineString') {
      trails.push(toRing(f.geometry.coordinates));
    } else {
      // Closed ways come out twice (as a line and as an area); keep only the point or area copy.
      if (type === 'LineString' || type === 'MultiLineString') continue;
      if (['private', 'no', 'customers'].includes(tags.access)) continue;
      const feature = featureKey(tags);
      if (!feature) continue;
      const point = type === 'Point' ? toPoint(f.geometry.coordinates) : ringCentroid(toPolygons(f.geometry)[0].outer);
      amenities.push({ ...point, feature, tags });
    }
  }

  // Build a summary and shape for every park.
  const entries = parks.map((p) => {
    const label = labelPoint(p.polygons);
    const all = p.polygons.flatMap((poly) => poly.outer);
    const lats = all.map((pt) => pt.lat);
    const lons = all.map((pt) => pt.lon);
    return {
      polygons: p.polygons,
      area: p.polygons.reduce((sum, poly) => sum + ringArea(poly.outer), 0),
      summary: {
        id: p.id,
        slug: slugify(p.tags.name),
        name: p.tags.name,
        kind: p.tags.leisure,
        lat: round(label.lat),
        lon: round(label.lon),
        bounds: [[round(Math.min(...lats)), round(Math.min(...lons))], [round(Math.max(...lats)), round(Math.max(...lons))]],
        outline: p.polygons.map((poly) => [poly.outer, ...poly.holes].map((ring) => toLatLngs(simplify(ring, SIMPLIFY)))),
        features: {
          playground: 0, splashPad: 0, dogPark: p.tags.leisure === 'dog_park' ? 1 : 0, pitch: 0,
          picnic: 0, bbq: 0, shelter: 0, fitness: 0, pool: 0, fishing: 0, boatLaunch: 0,
          toilets: 0, water: 0,
        },
        sports: [],
        trailMiles: 0,
        dogsAllowed: p.tags.dog || null,
        website: p.tags.website || p.tags['contact:website'] || null,
        hours: p.tags.opening_hours || null,
        operator: p.tags.operator || null,
      },
    };
  });

  // Assign each point to the smallest park that actually contains it.
  entries.sort((a, b) => a.area - b.area);
  const owner = (point) => entries.find((e) => pointInPolygons(point, e.polygons))?.summary || null;

  for (const a of amenities) {
    const park = owner(a);
    if (!park) continue;
    park.features[a.feature] += 1;
    if (a.feature === 'pitch' && a.tags.sport) {
      for (const s of a.tags.sport.split(';')) if (!park.sports.includes(s)) park.sports.push(s);
    }
  }

  for (const t of trails) {
    const park = owner(t[Math.floor(t.length / 2)]);
    if (park) park.trailMiles += pathMiles(t);
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
  try {
    const previous = JSON.parse(await readFile(OUTPUT, 'utf8'));
    if (output.length < previous.parks.length * 0.8) {
      throw new Error(`Only got ${output.length} parks (had ${previous.parks.length}). Keeping the existing data.`);
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

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
