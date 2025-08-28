import React from 'react';

const LocationPreview = ({ location }) => {
  const openInMaps = () => {
    const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    window.open(url, '_blank');
  };

  const formatCoordinates = (lat, lng) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  return (
    <div className="max-w-sm bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
      {/* Map preview */}
      <div className="relative h-32 bg-gray-200 dark:bg-gray-600">
        <img
          src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-l+000(${location.longitude},${location.latitude})/${location.longitude},${location.latitude},14/300x128?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw`}
          alt="Location preview"
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to a simple map placeholder
            e.target.src = `data:image/svg+xml;base64,${btoa(`
              <svg width="300" height="128" xmlns="http://www.w3.org/2000/svg">
                <rect width="300" height="128" fill="#e5e7eb"/>
                <circle cx="150" cy="64" r="20" fill="#ef4444"/>
                <text x="150" y="100" text-anchor="middle" font-family="Arial" font-size="12" fill="#374151">
                  ${formatCoordinates(location.latitude, location.longitude)}
                </text>
              </svg>
            `)}`;
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
        </div>
      </div>

      {/* Location details */}
      <div className="p-3">
        <div className="flex items-start space-x-2">
          <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Vị trí được chia sẻ
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
              {location.address}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formatCoordinates(location.latitude, location.longitude)}
              {location.accuracy && ` • Độ chính xác: ${Math.round(location.accuracy)}m`}
            </div>
          </div>
        </div>

        <button
          onClick={openInMaps}
          className="w-full mt-3 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span>Mở trong Google Maps</span>
        </button>
      </div>
    </div>
  );
};

export default LocationPreview;
