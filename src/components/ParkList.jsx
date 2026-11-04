import { useState } from 'react';
import { strengths, formatMiles } from '../utils/parks';
import { openStatus } from '../utils/hours';
import FavoriteButton from './FavoriteButton';
import './ParkList.css';

const PAGE = 40;

function ParkRow({ park, saved, onSelect, onToggleFavorite }) {
  const status = openStatus(park);
  return (
    <li>
      <button type="button" className="park-row" onClick={() => onSelect(park.slug)}>
        <span className="park-swatch" style={{ background: park.color }} aria-hidden="true" />
        <span className="park-row-main">
          <span className="park-name">{park.name}</span>
          <span className="park-reasons">
            {strengths(park).slice(0, 3).map((s) => s.activity.reason(park)).join(', ') || 'Open space'}
          </span>
        </span>
        <span className="park-row-meta">
          {park.match !== null && <span className="park-match">{Math.round(park.match * 100)}%</span>}
          {park.distance !== null && <span className="park-distance">{formatMiles(park.distance)}</span>}
          {status && (
            <span className={`open-badge ${status.open ? 'is-open' : ''}`}>{status.open ? 'Open' : 'Closed'}</span>
          )}
        </span>
      </button>
      <FavoriteButton name={park.name} saved={saved} onToggle={() => onToggleFavorite(park.slug)} />
    </li>
  );
}

function ParkList({ parks, selectedCount, onSelect, onClearFilters, favorites, onToggleFavorite, showSaved }) {
  // "Show more" applies to one list of results. When the list changes, start over.
  const [paging, setPaging] = useState({ parks, limit: PAGE });
  const limit = paging.parks === parks ? paging.limit : PAGE;

  if (!parks.length && showSaved) {
    return (
      <section className="park-list empty" aria-live="polite">
        <p>You haven't saved any parks yet.</p>
        <p>Tap the heart next to a park to save it here.</p>
      </section>
    );
  }

  if (!parks.length) {
    return (
      <section className="park-list empty" aria-live="polite">
        <p>No parks match all of those activities.</p>
        {selectedCount > 1 && <p>Turn one off to see more options.</p>}
        <button type="button" onClick={onClearFilters}>Clear filters</button>
      </section>
    );
  }

  return (
    <section className="park-list" aria-label="Matching parks">
      <h2>
        {parks.length} {showSaved ? 'saved ' : ''}
        {parks.length === 1 ? 'park' : 'parks'}
        {selectedCount ? ' matched' : ''}
      </h2>
      <ol>
        {parks.slice(0, limit).map((p) => (
          <ParkRow
            key={p.slug}
            park={p}
            saved={favorites.includes(p.slug)}
            onSelect={onSelect}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </ol>
      {limit < parks.length && (
        <button type="button" className="show-more" onClick={() => setPaging({ parks, limit: limit + PAGE })}>
          Show more parks
        </button>
      )}
    </section>
  );
}

export default ParkList;
