import React from 'react';

// Simple line icons, one per activity.
const PATHS = {
  kids: (
    <>
      <path d="M4 20V9l8-5 8 5v11" />
      <path d="M8 20v-6l8-4" />
      <circle cx="16" cy="18" r="2" />
    </>
  ),
  dogs: (
    <>
      <path d="M5 11c0-3 2-5 4-5l1 3h4l1-3c2 0 4 2 4 5v3a6 6 0 0 1-12 0z" />
      <circle cx="10" cy="13" r="0.6" fill="currentColor" />
      <circle cx="14" cy="13" r="0.6" fill="currentColor" />
      <path d="M11 16.5h2" />
    </>
  ),
  walking: (
    <>
      <circle cx="13" cy="4.5" r="1.8" />
      <path d="M11 21l2-6-3-3 1-4 4 3 3 1" />
      <path d="M10 12l-2 4" />
    </>
  ),
  picnic: (
    <>
      <path d="M3 10h18" />
      <path d="M6 10l-2 9M18 10l2 9M9 10l-1 4h8l-1-4" />
      <path d="M8 6c1-2 3-2 4 0s3 2 4 0" />
    </>
  ),
  sports: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M4.5 9c4 1 11 1 15 0M4.5 15c4-1 11-1 15 0M12 4v16" />
    </>
  ),
};

function ActivityIcon({ id, size = 28 }) {
  return (
    <svg
      className="activity-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[id]}
    </svg>
  );
}

export default ActivityIcon;
