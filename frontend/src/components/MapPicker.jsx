// components/MapPicker.jsx
// Interactive Leaflet map used in the donation form to pick a pickup location.
//
// UPGRADED: previously this silently fell back to a hardcoded Chennai
// coordinate whenever geolocation failed/was denied, which made pickup
// locations look "random" and disconnected from the typed address.
// Now it:
//   1. Explicitly asks for geolocation via a visible button (with loading/
//      error states) instead of silently failing.
//   2. Reverse-geocodes the picked pin into a real address string (via the
//      free OpenStreetMap Nominatim API) and reports it back to the parent,
//      so the address text and the map pin always describe the same place.
//   3. Lets the donor type/search an address and jump the pin there
//      (forward geocoding), so typing an address and clicking the map
//      always stay in sync.

import { useState, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { FiCrosshair, FiSearch, FiLoader } from 'react-icons/fi';

// Fix default marker icon paths (Leaflet + bundlers issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Free, no-API-key-needed geocoding service from the OpenStreetMap project —
// pairs naturally with the OSM tiles already used for the map itself.
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

/** Reverse geocode: [lng, lat] -> human-readable address string */
async function reverseGeocode([lng, lat]) {
  const res = await fetch(
    `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17&addressdetails=0`,
    { headers: { Accept: 'application/json' } }
  );
  if (!res.ok) throw new Error('Reverse geocoding failed');
  const data = await res.json();
  return data.display_name || '';
}

/** Forward geocode: address string -> [lng, lat] + display name */
async function forwardGeocode(query) {
  const res = await fetch(
    `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
    { headers: { Accept: 'application/json' } }
  );
  if (!res.ok) throw new Error('Address search failed');
  const data = await res.json();
  if (!data.length) return null;
  return {
    coords: [parseFloat(data[0].lon), parseFloat(data[0].lat)],
    displayName: data[0].display_name,
  };
}

const ClickHandler = ({ onPick }) => {
  useMapEvents({
    click(e) {
      onPick([e.latlng.lng, e.latlng.lat]);
    },
  });
  return null;
};

// Recenters the map imperatively when position changes from outside a click
// (geolocation button / address search), since MapContainer's `center` prop
// only applies on first render.
const RecenterOnChange = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]]);
  return null;
};

const MapPicker = ({ initialCoords = null, onChange, onAddressResolved, height = '280px' }) => {
  // No hardcoded city fallback anymore — start centered on India broadly
  // until we know a real location, and clearly communicate that state
  // instead of silently pretending it's accurate.
  const [position, setPosition] = useState(initialCoords || [78.9629, 20.5937]);
  const [hasRealLocation, setHasRealLocation] = useState(Boolean(initialCoords));
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const resolveAndReport = useCallback(
    async (coords, skipReverseGeocode = false) => {
      setPosition(coords);
      setHasRealLocation(true);
      onChange && onChange(coords);

      if (skipReverseGeocode) return;
      try {
        const address = await reverseGeocode(coords);
        if (address) onAddressResolved && onAddressResolved(address);
      } catch {
        // Non-fatal: donor can still type the address manually.
      }
    },
    [onChange, onAddressResolved]
  );

  const handleMapClick = useCallback(
    (coords) => {
      resolveAndReport(coords);
    },
    [resolveAndReport]
  );

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocateError('Geolocation is not supported on this device/browser.');
      return;
    }
    setLocating(true);
    setLocateError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.longitude, pos.coords.latitude];
        resolveAndReport(coords);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Please allow location access, or search/click the map instead.'
            : 'Could not get your current location. Please search or click the map instead.'
        );
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Debounced live address search as the donor types
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) return undefined;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const result = await forwardGeocode(searchQuery);
        if (result) {
          resolveAndReport(result.coords, true); // skip reverse-geocode, we already have the name
          onAddressResolved && onAddressResolved(result.displayName);
        }
      } catch {
        // Non-fatal: donor can keep typing or use the map directly.
      } finally {
        setSearching(false);
      }
    }, 900);

    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const center = [position[1], position[0]]; // Leaflet wants [lat, lng]

  return (
    <div>
      <div className="mb-2 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search an address to place the pin..."
            className="input-field pl-9 text-sm"
          />
          {searching && (
            <FiLoader className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" size={15} />
          )}
        </div>
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={locating}
          className="btn-secondary !py-2 shrink-0 text-sm"
        >
          {locating ? <FiLoader className="animate-spin" size={15} /> : <FiCrosshair size={15} />}
          {locating ? 'Locating...' : 'Use My Location'}
        </button>
      </div>

      {locateError && <p className="mb-2 text-xs text-red-500">{locateError}</p>}

      <div style={{ height }} className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
        <MapContainer center={center} zoom={hasRealLocation ? 15 : 5} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={center} />
          <ClickHandler onPick={handleMapClick} />
          <RecenterOnChange center={center} />
        </MapContainer>
      </div>

      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {hasRealLocation
          ? 'Pin set. Click the map to fine-tune the exact pickup spot.'
          : 'Click "Use My Location", search an address above, or click directly on the map to set the pickup point.'}
      </p>
    </div>
  );
};

export default MapPicker;