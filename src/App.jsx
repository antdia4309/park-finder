import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import Header from './components/Header';
import ActivityFilters from './components/ActivityFilters';
import ParkList from './components/ParkList';
import ParkDetails from './components/ParkDetails';
import ParkMap from './components/ParkMap';
import WeatherNudge from './components/WeatherNudge';
import DataStatus from './components/DataStatus';
import { rankParks } from './utils/parks';
import { readUrlState, buildSearch } from './utils/url';
import { useFavorites } from './utils/favorites';
import { useParkData } from './utils/data';

// The chart library is large and the chart sits below the list, so load it only when needed.
const AmenityChart = lazy(() => import('./components/AmenityChart'));

// Stays the same object between renders, so the lists below don't recompute while loading.
const NO_PARKS = [];

function App() {
  // Read the URL once, on first render.
  const [initial] = useState(readUrlState);
  const [selected, setSelected] = useState(initial.selected);
  const [query, setQuery] = useState(initial.query);
  const [selectedSlug, setSelectedSlug] = useState(initial.park);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const { favorites, toggleFavorite } = useFavorites();
  const { status, data, retry } = useParkData();
  const everyPark = data ? data.parks : NO_PARKS;

  const ranked = useMemo(
    () => rankParks(everyPark, { selected, query, userLocation }),
    [everyPark, selected, query, userLocation]
  );
  const parks = useMemo(
    () => (showSaved ? ranked.filter((p) => favorites.includes(p.slug)) : ranked),
    [ranked, showSaved, favorites]
  );

  // A shared link can point at a park that the current filters hide, so look it up across all parks.
  const allParks = useMemo(
    () => rankParks(everyPark, { selected: [], query: '', userLocation }),
    [everyPark, userLocation]
  );
  const activePark =
    parks.find((p) => p.slug === selectedSlug) || allParks.find((p) => p.slug === selectedSlug) || null;
  const mapParks = activePark && !parks.includes(activePark) ? [...parks, activePark] : parks;

  // Keep the URL in sync. Opening a park adds a history entry so Back returns to the results;
  // filter and search changes just update the current entry.
  const fromHistory = useRef(false);
  const lastPark = useRef(initial.park);
  useEffect(() => {
    if (fromHistory.current) {
      fromHistory.current = false;
      lastPark.current = selectedSlug;
      return;
    }
    const url = `${window.location.pathname}${buildSearch({ selected, query, park: selectedSlug })}`;
    if (url === `${window.location.pathname}${window.location.search}`) return;
    if (selectedSlug && selectedSlug !== lastPark.current) window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
    lastPark.current = selectedSlug;
  }, [selected, query, selectedSlug]);

  useEffect(() => {
    const onPop = () => {
      const state = readUrlState();
      fromHistory.current = true;
      setSelected(state.selected);
      setQuery(state.query);
      setSelectedSlug(state.park);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    document.title = activePark ? `${activePark.name} | ParkFinder` : 'ParkFinder';
  }, [activePark]);

  const toggleActivity = (id) => {
    setSelectedSlug(null);
    setSelected((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const handleQuery = (value) => {
    setSelectedSlug(null);
    setQuery(value);
  };

  const handleSelect = useCallback((id) => setSelectedSlug(id), []);
  
  const handleBack = () => setSelectedSlug(null);

  // The weather tip's button jumps straight to one activity.
  const pickActivity = (id) => {
    setSelectedSlug(null);
    setShowSaved(false);
    setSelected([id]);
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocationError('Your browser does not support location. Search by name instead.');
      return;
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError('Location is blocked. Allow it in your browser settings to sort by distance.');
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  return (
    <div className="App">
      <aside className="panel">
        <Header parkCount={data ? data.parks.length : null} />
        {activePark ? (
          <ParkDetails
            key={activePark.slug}
            park={activePark}
            onBack={handleBack}
            saved={favorites.includes(activePark.slug)}
            onToggleFavorite={() => toggleFavorite(activePark.slug)}
          />
        ) : (
          <>
            <WeatherNudge onPick={pickActivity} />
            <ActivityFilters
              selected={selected}
              onToggle={toggleActivity}
              query={query}
              onQueryChange={handleQuery}
              userLocation={userLocation}
              locating={locating}
              onLocate={handleLocate}
              locationError={locationError}
              showSaved={showSaved}
              onToggleSaved={() => setShowSaved((v) => !v)}
              savedCount={favorites.length}
            />
            {status === 'ready' ? (
              <>
                <ParkList
                  parks={parks}
                  selectedCount={selected.length}
                  onSelect={handleSelect}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  showSaved={showSaved}
                  onClearFilters={() => {
                    setSelected([]);
                    setQuery('');
                  }}
                />
                <Suspense fallback={null}>
                  <AmenityChart parks={parks} />
                </Suspense>
              </>
            ) : (
              <DataStatus status={status} onRetry={retry} />
            )}
          </>
        )}
        {data && (
          <footer className="credit">
            Park data from OpenStreetMap contributors, updated{' '}
            {new Date(data.generatedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}.
          </footer>
        )}
      </aside>
      <main className="map-area">
        <ParkMap
          parks={mapParks}
          selectedSlug={activePark ? activePark.slug : null}
          onSelect={handleSelect}
          userLocation={userLocation}
        />
      </main>
    </div>
  );
}

export default App;
