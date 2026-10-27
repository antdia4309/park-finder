import React, { useCallback, useMemo, useState } from 'react';
import './App.css';
import parkData from './data/parks.json';
import Header from './components/Header';
import ActivityFilters from './components/ActivityFilters';
import ParkList from './components/ParkList';
import ParkDetails from './components/ParkDetails';
import ParkMap from './components/ParkMap';
import AmenityChart from './components/AmenityChart';
import { rankParks } from './utils/parks';

function App() {
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const parks = useMemo(
    () => rankParks(parkData.parks, { selected, query, userLocation }),
    [selected, query, userLocation]
  );

  const activePark = parks.find((p) => p.id === selectedId) || null;

  const toggleActivity = (id) => {
    setSelectedId(null);
    setSelected((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const handleQuery = (value) => {
    setSelectedId(null);
    setQuery(value);
  };

  const handleSelect = useCallback((id) => setSelectedId(id), []);

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
          <ParkDetails park={activePark} onBack={() => setSelectedId(null)} />
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
        <ParkMap parks={parks} selectedId={selectedId} onSelect={handleSelect} userLocation={userLocation} />
      </main>
    </div>
  );
}

export default App;
