import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import parkData from './data/parks.json';
import Header from './components/Header';
import ActivityFilters from './components/ActivityFilters';
import ParkList from './components/ParkList';
import ParkDetails from './components/ParkDetails';
import ParkMap from './components/ParkMap';
import AmenityChart from './components/AmenityChart';
import { rankParks } from './utils/parks';
import { readUrlState, buildSearch } from './utils/url';

function App() {
  const initial = useRef(readUrlState()).current;
  const [selected, setSelected] = useState(initial.selected);
  const [query, setQuery] = useState(initial.query);
  const [selectedSlug, setSelectedSlug] = useState(initial.park);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const parks = useMemo(
    () => rankParks(parkData.parks, { selected, query, userLocation }),
    [selected, query, userLocation]
  );

  // A shared link can point at a park that the current filters hide, so look it up across all parks.
  const allParks = useMemo(
    () => rankParks(parkData.parks, { selected: [], query: '', userLocation }),
    [userLocation]
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
        <Header parkCount={parkData.parks.length} />
        {activePark ? (
          <ParkDetails park={activePark} onBack={handleBack} />
        ) : (
          <>
            <ActivityFilters
              selected={selected}
              onToggle={toggleActivity}
              query={query}
              onQueryChange={handleQuery}
              userLocation={userLocation}
              locating={locating}
              onLocate={handleLocate}
              locationError={locationError}
            />
            <ParkList
              parks={parks}
              selectedCount={selected.length}
              onSelect={handleSelect}
              onClearFilters={() => {
                setSelected([]);
                setQuery('');
              }}
            />
            <AmenityChart parks={parks} />
          </>
        )}
        <footer className="credit">
          Park data from OpenStreetMap contributors, updated{' '}
          {new Date(parkData.generatedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}.
        </footer>
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
