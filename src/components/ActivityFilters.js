import React from 'react';
import { ACTIVITIES } from '../utils/parks';
import ActivityIcon from './ActivityIcon';
import './ActivityFilters.css';

function ActivityFilters({ selected, onToggle, query, onQueryChange, userLocation, locating, onLocate, locationError }) {
  return (
    <section className="filters" aria-label="Search parks">
      <label className="search-label" htmlFor="park-search">Search by park name</label>
      <input
        id="park-search"
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Try Byrd, Maymont, or Belle Isle"
      />

      <fieldset className="activities">
        <legend>What do you want to do?</legend>
        <div className="activity-grid">
          {ACTIVITIES.map((a) => {
            const on = selected.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                className={`activity ${on ? 'is-on' : ''}`}
                style={{ '--activity': a.color }}
                aria-pressed={on}
                onClick={() => onToggle(a.id)}
              >
                <ActivityIcon id={a.id} />
                <span className="activity-label">{a.label}</span>
                <span className="activity-hint">{a.hint}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <button type="button" className="locate" onClick={onLocate} disabled={locating}>
        {locating ? 'Finding your location…' : userLocation ? 'Update my location' : 'Sort by distance from me'}
      </button>
      {locationError && <p className="filter-error" role="alert">{locationError}</p>}
    </section>
  );
}

export default ActivityFilters;
