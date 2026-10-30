import React from 'react';
import { strengths, formatMiles } from '../utils/parks';
import './ParkList.css';

const PAGE = 40;

function ParkList({ parks, selectedCount, onSelect, onClearFilters }) {
  const [limit, setLimit] = React.useState(PAGE);

  React.useEffect(() => setLimit(PAGE), [parks]);

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
        {parks.length} {parks.length === 1 ? 'park' : 'parks'}
        {selectedCount ? ' matched' : ''}
      </h2>
      <ol>
        {parks.slice(0, limit).map((p) => (
          <li key={p.slug}>
            <button type="button" className="park-row" onClick={() => onSelect(p.slug)}>
              <span className="park-swatch" style={{ background: p.color }} aria-hidden="true" />
              <span className="park-row-main">
                <span className="park-name">{p.name}</span>
                <span className="park-reasons">
                  {strengths(p).slice(0, 3).map((s) => s.activity.reason(p)).join(', ') || 'Open space'}
                </span>
              </span>
              <span className="park-row-meta">
                {p.match !== null && <span className="park-match">{Math.round(p.match * 100)}%</span>}
                {p.distance !== null && <span className="park-distance">{formatMiles(p.distance)}</span>}
              </span>
            </button>
          </li>
        ))}
      </ol>
      {limit < parks.length && (
        <button type="button" className="show-more" onClick={() => setLimit(limit + PAGE)}>
          Show more parks
        </button>
      )}
    </section>
  );
}

export default ParkList;
