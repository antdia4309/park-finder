// A small reader for the OpenStreetMap opening_hours values parks actually use:
// "24/7", "sunrise-sunset", "dawn-dusk", "06:00-23:00", "Mo-Fr 08:00-17:00",
// and rules joined with ";". Anything fancier returns null and the app just
// shows the raw hours text.
import SunCalc from 'suncalc';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const TIME = /^(\d{1,2}):(\d{2})$/;
const EVENTS = ['sunrise', 'sunset', 'dawn', 'dusk'];

// "Mo-Fr" or "Sa,Su" -> set of day numbers (0 = Sunday)
function parseDays(text) {
  const days = new Set();
  for (const part of text.split(',')) {
    const [from, to] = part.split('-');
    const start = DAYS.indexOf(from);
    const end = to ? DAYS.indexOf(to) : start;
    if (start === -1 || end === -1) return null;
    for (let d = start; ; d = (d + 1) % 7) {
      days.add(d);
      if (d === end) break;
    }
  }
  return days;
}

function parseRule(rule) {
  const text = rule.trim();
  if (text === '24/7') return { days: null, from: '00:00', to: '24:00' };
  const match = text.match(/^(?:([A-Za-z,-]+)\s+)?([\w:]+)-([\w:]+)$/);
  if (!match) return null;
  const [, dayText, from, to] = match;
  const days = dayText ? parseDays(dayText) : null;
  if (dayText && !days) return null;
  const valid = (t) => TIME.test(t) || EVENTS.includes(t);
  if (!valid(from) || !valid(to)) return null;
  return { days, from, to };
}

// Months, holidays, notes in quotes, and "||" fallbacks are beyond this reader.
const UNSUPPORTED = /["|]|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|PH|SH)\b/;

export function parseHours(value) {
  if (!value || UNSUPPORTED.test(value)) return null;
  const rules = value.split(';').map(parseRule);
  return rules.every(Boolean) ? rules : null;
}

// Turns "18:30", "sunset", etc. into a Date on the given day.
function resolve(point, day, lat, lon) {
  if (EVENTS.includes(point)) return SunCalc.getTimes(day, lat, lon)[point];
  const [, h, m] = point.match(TIME);
  const d = new Date(day);
  d.setHours(Number(h), Number(m), 0, 0);
  return d;
}

const formatTime = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

// { open, label } for right now, or null if the hours can't be read.
export function openStatus(park, now = new Date()) {
  const rules = parseHours(park.hours);
  if (!rules) return null;

  // Like OpenStreetMap, a later rule overrides earlier ones for the days it covers.
  const ruleFor = (day) => [...rules].reverse().find((r) => !r.days || r.days.has(day.getDay())) || null;
  const today = ruleFor(now);
  if (!today) return { open: false, label: 'Closed today' };
  if (today.from === '00:00' && today.to === '24:00') return { open: true, label: 'Open 24 hours' };

  const start = resolve(today.from, now, park.lat, park.lon);
  const end = resolve(today.to, now, park.lat, park.lon);
  if (now >= start && now < end) return { open: true, label: `Open until ${formatTime(end)}` };
  if (now < start) return { open: false, label: `Closed · opens ${formatTime(start)}` };
  return { open: false, label: 'Closed for today' };
}
