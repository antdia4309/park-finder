import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, CircleMarker, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
// Adds L.markerClusterGroup. It attaches to Leaflet's global L, so it must come after Leaflet.
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet/dist/leaflet.css';
import './ParkMap.css';

const RICHMOND = [37.5407, -77.436];

// Icons are reused: every park with the same color shares one icon object,
// instead of building 329 separate ones each time the map updates.
const iconCache = new Map();
function markerIcon(color, active) {
  const key = `${color}-${active}`;
  if (!iconCache.has(key)) {
    const size = active ? 26 : 16;
    iconCache.set(
      key,
      L.divIcon({
        className: '',
        html: `<span class="park-pin${active ? ' is-active' : ''}" style="--pin:${color}"></span>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })
    );
  }
  return iconCache.get(key);
}

// Groups nearby parks into a numbered circle when zoomed out.
function clusterIcon(cluster) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 34 : count < 50 ? 42 : 50;
  return L.divIcon({
    className: '',
    html: `<span class="park-cluster" style="width:${size}px;height:${size}px">${count}</span>`,
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

// Draws every park except the selected one as a clustered marker. The markers are
// added in one bulk call, which lets the cluster plugin spread the work out instead
// of recalculating after each of the 300+ markers.
function ParkMarkers({ parks, selectedSlug, onSelect }) {
  const map = useMap();
  const groupRef = useRef(null);

  // Clicks always call the latest onSelect without rebuilding every marker.
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  // Create the cluster layer once.
  useEffect(() => {
    const group = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60,
      showCoverageOnHover: false,
      iconCreateFunction: clusterIcon,
    });
    map.addLayer(group);
    groupRef.current = group;
    return () => map.removeLayer(group);
  }, [map]);

  // Replace the markers whenever the matching parks change.
  useEffect(() => {
    const group = groupRef.current;
    group.clearLayers();
    group.addLayers(
      parks
        .filter((p) => p.slug !== selectedSlug)
        .map((p) =>
          L.marker([p.lat, p.lon], {
            icon: markerIcon(p.color, false),
            keyboard: false,
            // The browser's built-in hover label; much lighter than a tooltip per park.
            title: p.name,
          }).on('click', () => onSelectRef.current(p.slug))
        )
    );
  }, [parks, selectedSlug]);

  return null;
}

function ParkMap({ parks, selectedSlug, onSelect, userLocation }) {
  const selected = parks.find((p) => p.slug === selectedSlug) || null;

  return (
    <div className="park-map" role="region" aria-label="Map of matching parks">
      <MapContainer center={RICHMOND} zoom={11} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
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
        {/* The selected park is drawn separately, outside the clusters, so it's never hidden inside one. */}
        <ParkMarkers parks={parks} selectedSlug={selectedSlug} onSelect={onSelect} />
        {selected && (
          <Marker
            key={`selected-${selected.slug}`}
            position={[selected.lat, selected.lon]}
            icon={markerIcon(selected.color, true)}
            zIndexOffset={1000}
            keyboard={false}
          >
            <Tooltip direction="top" offset={[0, -14]}>{selected.name}</Tooltip>
          </Marker>
        )}
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
