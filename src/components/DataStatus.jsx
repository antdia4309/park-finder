import './DataStatus.css';

// Shown in place of the results while park data downloads, or if it fails.
function DataStatus({ status, onRetry }) {
  if (status === 'error') {
    return (
      <section className="data-status is-error" role="alert">
        <p>Couldn't load the park list. Check your connection and try again.</p>
        <button type="button" onClick={onRetry}>Try again</button>
      </section>
    );
  }
  return (
    <section className="data-status" aria-live="polite">
      <p>Loading parks…</p>
      <div className="skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}

export default DataStatus;
