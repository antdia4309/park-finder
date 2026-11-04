import { weatherNudge } from './weather';

test('suggests water spots on hot days', () => {
  const nudge = weatherNudge({ temp: 93, rain: 0 });
  expect(nudge.kind).toBe('hot');
  expect(nudge.action.activity).toBe('water');
});

test('warns about mud after heavy rain', () => {
  expect(weatherNudge({ temp: 70, rain: 0.8 }).kind).toBe('rain');
});

test('stays quiet on an ordinary day', () => {
  expect(weatherNudge({ temp: 72, rain: 0.1 })).toBeNull();
});
