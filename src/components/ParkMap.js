import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, CircleMarker, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './ParkMap.css';

const RICHMOND = [37.5407, -77.436];

function markerIcon(color, active) {
  const size = active ? 26 : 16;
  return L.divIcon({
    className: '',
    html: `<span class="park-pin${active ? ' is-active' : ''}" style="--pin:${color}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Moves the map when a park is selected or the user shares their location.
function MapFocus({ park, userLocation }) {
  const map = useMap();

  useEffect(() => {
    if (park) {
      map.flyToBounds(park.bounds, { maxZoom: 16, padding: [40, 40], duration: 0.8 });
    }
  }, [map, park]);

  useEffect(() => {
    if (userLocation && !park) map.flyTo([userLocation.lat, userLocation.lon], 13, { duration: 0.8 });
    // Only react to new locations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, userLocation]);

  return null;
}

function ParkMap({ parks, selectedSlug, onSelect, userLocation }) {
  const selected = parks.find((p) => p.slug === selectedSlug) || null;

  const markers = useMemo(
    () =>
      parks.map((p) => (
        <Marker
          key={p.slug}
          position={[p.lat, p.lon]}
          icon={markerIcon(p.color, p.slug === selectedSlug)}
          zIndexOffset={p.slug === selectedSlug ? 1000 : 0}
          keyboard={false}
          eventHandlers={{ click: () => onSelect(p.slug) }}
        >
          <Tooltip direction="top" offset={[0, -8]}>{p.name}</Tooltip>
        </Marker>
      )),
    [parks, selectedSlug, onSelect]
  );

  return (
    <div className="park-map" role="region" aria-label="Map of matching parks">
      <MapContainer center={RICHMOND} zoom={12} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
          attribution='Tiles &copy; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {selected?.outline && (
          <Polygon
            key={`outline-${selected.slug}`}
            positions={selected.outline}
            interactive={false}
            pathOptions={{ color: selected.color, weight: 3, fillColor: selected.color, fillOpacity: 0.12 }}
          />
        )}
        {markers}
        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lon]}
            radius={8}
            pathOptions={{ color: '#fff', weight: 3, fillColor: '#1E2A22', fillOpacity: 1 }}
          >
            <Tooltip>You are here</Tooltip>
          </CircleMarker>
        )}
        <MapFocus park={selected} userLocation={userLocation} />
      </MapContainer>
    </div>
  );
}

export default ParkMap;
