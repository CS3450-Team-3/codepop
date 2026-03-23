import React, { useEffect, useState } from "react";

export default function Locations() {
  const [coords, setCoords] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ latitude, longitude });

        // Reverse geocode using OpenStreetMap
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();

          setLocationName(data.display_name);
        } catch (err) {
          console.error(err);
        }
      },
      () => {
        setError("Unable to retrieve your location");
      }
    );
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 text-center">
      <div className="bg-white p-6 rounded-xl shadow-md max-w-md w-full">
        <h1 className="text-xl font-semibold mb-4">
          Your Location
        </h1>

        {error && (
          <p className="text-red-500">{error}</p>
        )}

        {!coords && !error && (
          <p className="text-gray-500">Getting your location...</p>
        )}

        {coords && (
          <div className="space-y-2">
            <p>
              <span className="font-medium">Latitude:</span>{" "}
              {coords.latitude}
            </p>
            <p>
              <span className="font-medium">Longitude:</span>{" "}
              {coords.longitude}
            </p>

            {locationName && (
              <p className="text-gray-600 mt-3">
                {locationName}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};