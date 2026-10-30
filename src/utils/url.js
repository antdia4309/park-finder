// Keeps filters and the selected park in the page URL so links can be shared,
// e.g. ?do=kids,picnic&q=byrd&park=byrd-park
import { ACTIVITY_BY_ID } from './parks';

export function readUrlState(search = window.location.search) {
  const params = new URLSearchParams(search);
  const selected = (params.get('do') || '')
    .split(',')
    .map((s) => s.trim())
    .filter((id, i, all) => ACTIVITY_BY_ID[id] && all.indexOf(id) === i);
    return { 
        selected,
        query: params.get('q') || '',
        park: params.get('park') || null,
    };
}

export function buildSearch({ selected, query, park }) {
    const params = new URLSearchParams();
    if (selected.length) params.set('do', selected.join(','));
    if (query.trim()) params.set('q', query.trim());
    if (park) params.set('park', park);
    // Keep commas readable instead of %2C.
    const search = params.toString().replace(/%2C/g, ',');
    return search ? `?${search}` : '';
}