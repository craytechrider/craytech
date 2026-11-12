import React from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

interface DeliveryMapProps {
  latitude: number;
  longitude: number;
  customerName?: string;
  address?: string;
}

const deliveryIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: #1749D1;
      border: 4px solid white;
      box-shadow: 0 3px 12px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
    ">
      🚚
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  popupAnchor: [0, -22],
});

const DeliveryMap: React.FC<DeliveryMapProps> = ({
  latitude,
  longitude,
  customerName,
  address,
}) => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        Delivery location is unavailable.
      </div>
    );
  }

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={16}
      scrollWheelZoom={true}
      className="h-full min-h-[320px] w-full rounded-2xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={[latitude, longitude]} icon={deliveryIcon}>
        <Popup>
          <div className="min-w-[200px]">
            <p className="font-bold text-slate-900">
              {customerName || "Delivery Location"}
            </p>

            {address && (
              <p className="mt-1 text-sm text-slate-600">{address}</p>
            )}

            <p className="mt-2 text-xs text-slate-400">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </p>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
};

export default DeliveryMap;
