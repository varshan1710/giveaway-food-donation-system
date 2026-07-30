// components/DonationsMapView.jsx
// Read-only Leaflet map showing multiple donation pickup locations as markers
// (used by NGOs to browse nearby donations spatially).

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DonationsMapView = ({ donations = [], center = [13.0827, 80.2707], height = '400px' }) => {
  return (
    <div style={{ height }} className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {donations
          .filter((d) => d.pickupLocation?.coordinates)
          .map((d) => {
            const [lng, lat] = d.pickupLocation.coordinates;
            return (
              <Marker key={d._id} position={[lat, lng]}>
                <Popup>
                  <p className="font-semibold">{d.foodName}</p>
                  <p className="text-xs">
                    {d.quantity?.value} {d.quantity?.unit} · expires{' '}
                    {new Date(d.expiryDate).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">{d.pickupLocation.address}</p>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
};

export default DonationsMapView;
