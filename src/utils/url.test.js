import { readUrlState, buildSearch } from './url';

test('reads activities, search, and park from the query string', () => {
  expect(readUrlState('?do=kids,dogs&q=byrd&park=byrd-park')).toEqual({
    selected: ['kids', 'dogs'],
    query: 'byrd',
    park: 'byrd-park',
  });
});

test('ignores unknown and repeated activities', () => {
  expect(readUrlState('?do=kids,skydiving,kids').selected).toEqual(['kids']);
});

test('builds a clean query string', () => {
  expect(buildSearch({ selected: ['kids', 'picnic'], query: ' maymont ', park: null })).toBe('?do=kids,picnic&q=maymont');
  expect(buildSearch({ selected: [], query: '', park: null })).toBe('');
});

test('round-trips through the URL', () => {
  const state = { selected: ['walking'], query: 'belle isle', park: 'belle-isle' };
  expect(readUrlState(buildSearch(state))).toEqual(state);
});