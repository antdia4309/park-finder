import React from 'react';
import './FavoriteButton.css';

function FavoriteButton({ name, saved, onToggle, withLabel = false }) {
  return (
    <button
      type="button"
      className={`favorite ${saved ? 'is-saved' : ''} ${withLabel ? 'with-label' : ''}`}
      aria-pressed={saved}
      aria-label={withLabel ? undefined : saved ? `Remove ${name} from saved parks` : `Save ${name}`}
      onClick={onToggle}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          d="M12 20s-7-4.4-9.2-8.6C1.3 8.4 3 5 6.4 5c2 0 3.3 1.1 4.1 2.3h3C14.3 6.1 15.6 5 17.6 5 21 5 22.7 8.4 21.2 11.4 19 15.6 12 20 12 20z"
          fill={saved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
      {withLabel && <span>{saved ? 'Saved' : 'Save park'}</span>}
    </button>
  );
}

export default FavoriteButton;
