import { parseHours, openStatus } from './hours';

const park = (hours) => ({ hours, lat: 37.54, lon: -77.47 });
const at = (y, m, d, h, min = 0) => new Date(y, m - 1, d, h, min);

test('reads the common formats', () => {
  expect(parseHours('24/7')).not.toBeNull();
  expect(parseHours('sunrise-sunset')).not.toBeNull();
  expect(parseHours('dawn-dusk')).not.toBeNull();
  expect(parseHours('Mo-Fr 08:00-17:00')).not.toBeNull();
  expect(parseHours('Mo-Su 06:00-24:00')).not.toBeNull();
  expect(parseHours('Mo-Fr 08:00-17:00; Sa 09:00-12:00')).not.toBeNull();
});

test('gives up on formats it does not understand', () => {
  expect(parseHours('10:00-17:00; Mar-Oct 10:00-17:00 || Mar-Oct 17:00-19:00 "weather permitting"')).toBeNull();
  expect(parseHours('')).toBeNull();
  expect(openStatus(park('by appointment'))).toBeNull();
});

test('open all day', () => {
  expect(openStatus(park('24/7'), at(2026, 7, 4, 3))).toEqual({ open: true, label: 'Open 24 hours' });
});

test('fixed hours on weekdays', () => {
  // Wednesday Nov 4, 2026
  expect(openStatus(park('Mo-Fr 08:00-17:00'), at(2026, 11, 4, 12)).open).toBe(true);
  expect(openStatus(park('Mo-Fr 08:00-17:00'), at(2026, 11, 4, 7)).label).toMatch(/^Closed · opens 8:00/);
  expect(openStatus(park('Mo-Fr 08:00-17:00'), at(2026, 11, 4, 18)).label).toBe('Closed for today');
  // Saturday Nov 7, 2026
  expect(openStatus(park('Mo-Fr 08:00-17:00'), at(2026, 11, 7, 12)).label).toBe('Closed today');
});

test('sunrise to sunset follows the sun', () => {
  expect(openStatus(park('sunrise-sunset'), at(2026, 6, 21, 13)).open).toBe(true);
  expect(openStatus(park('sunrise-sunset'), at(2026, 6, 21, 2)).open).toBe(false);
});

test('a later rule overrides earlier ones', () => {
  const hours = 'Mo-Su 08:00-20:00; Su 10:00-16:00';
  expect(openStatus(park(hours), at(2026, 11, 8, 9)).open).toBe(false); // Sunday 9am
  expect(openStatus(park(hours), at(2026, 11, 9, 9)).open).toBe(true); // Monday 9am
});
