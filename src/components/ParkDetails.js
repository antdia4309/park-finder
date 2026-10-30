import React from 'react';
import { strengths, formatMiles } from '../utils/parks';
import ActivityIcon from './ActivityIcon';
import './ParkDetails.css';

const AMENITIES = [
  ['playground', 'Playgrounds'],
  ['dogPark', 'Dog parks'],
  ['pitch', 'Fields and courts'],
  ['picnic', 'Picnic spots'],
  ['bbq', 'Grills'],
  ['shelter', 'Shelters'],
  ['toilets', 'Restrooms'],
  ['water', 'Water fountains'],
  ['fitness', 'Fitness stations'],
  ['pool', 'Pools'],
];

function ParkDetails({ park, onBack }) {
  const headingRef = React.useRef(null);
  const [shareStatus, setShareStatus] = React.useState('');
  React.useEffect(() => {
    headingRef.current?.focus();
    setShareStatus('');
  }, [park.slug]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${park.name} | ParkFinder`, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShareStatus('Link copied');
      } else {
        window.prompt('Copy this link:', url);
      }
    } catch (err) {
      // Closing the share sheet throws AbortError; that's not a failure.
      if (err.name !== 'AbortError') setShareStatus('Could not copy the link');
    }
  };

  const good = strengths(park);
  const present = AMENITIES.filter(([key]) => park.features[key] > 0);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${park.lat},${park.lon}`;
  const osm = `https://www.openstreetmap.org/${park.id}`;

  return (
    <section className="park-details" aria-labelledby="park-details-name">
      <button type="button" className="back" onClick={onBack}>Back to results</button>

      <h2 id="park-details-name" ref={headingRef} tabIndex={-1}>{park.name}</h2>
      <p className="details-sub">
        {park.kind === 'dog_park' ? 'Dog park' : park.kind === 'nature_reserve' ? 'Nature area' : 'Park'}
        {park.distance !== null && `, ${formatMiles(park.distance)}`}
        {park.match !== null && `, ${Math.round(park.match * 100)}% match`}
      </p>

      {good.length > 0 && (
        <>
          <h3>Good for</h3>
          <ul className="good-for">
            {good.map(({ activity }) => (
              <li key={activity.id} style={{ '--activity': activity.color }}>
                <ActivityIcon id={activity.id} size={22} />
                <span>
                  <strong>{activity.label}</strong>
                  <span>{activity.reason(park)}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3>What's here</h3>
      {present.length || park.trailMiles > 0 ? (
        <dl className="amenities">
          {park.trailMiles > 0 && (
            <div><dt>Paths</dt><dd>{park.trailMiles.toFixed(1)} mi</dd></div>
          )}
          {present.map(([key, label]) => (
            <div key={key}><dt>{label}</dt><dd>{park.features[key]}</dd></div>
          ))}
        </dl>
      ) : (
        <p className="muted">No amenities are mapped for this park yet.</p>
      )}

      {park.sports.length > 0 && (
        <p className="muted">Sports: {park.sports.map((s) => s.replace(/_/g, ' ')).join(', ')}</p>
      )}
      {park.hours && <p className="muted">Hours: {park.hours}</p>}
      {park.operator && <p className="muted">Run by {park.operator}</p>}

      <div className="details-actions">
        <a className="primary" href={directions} target="_blank" rel="noopener noreferrer">Get directions</a>
        <button type="button" className="share" onClick={handleShare}>Share this park</button>
        {park.website && <a href={park.website} target="_blank" rel="noopener noreferrer">Park website</a>}
        <a href={osm} target="_blank" rel="noopener noreferrer">Fix this park's info</a>
      </div>
      <p className="share-status" role="status">{shareStatus}</p>
    </section>
  );
}

export default ParkDetails;
