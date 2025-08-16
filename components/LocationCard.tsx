import React from "react";

// Type definition for travel data
interface TravelData {
  location: string;
  country: string;
  travelTimeToHere: string;
  timeZone: string;
  arrivalDate: string;
  departureDate: string;
  daysAtPlace: number;
}

interface LocationCardProps {
  trip: TravelData;
  isCurrent?: boolean;
}

const LocationCard: React.FC<LocationCardProps> = ({
  trip,
  isCurrent = false,
}) => {
  const isLongStay = trip.daysAtPlace >= 5;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div
      className={`rounded-lg p-4 border transition-all duration-200 hover:shadow-md ${
        isCurrent
          ? "bg-blue-50 border-blue-200 shadow-sm"
          : isLongStay
          ? "bg-white border-green-200 hover:border-green-300 shadow-sm border-2"
          : "bg-gray-50 border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* Header Section */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            {/* Location Pin Icon */}
            {isLongStay ? (
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
              </div>
            ) : (
              <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-gray-500"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
              </div>
            )}

            {/* Location Name */}
            <div>
              <h3
                className={`font-semibold ${
                  isCurrent
                    ? "text-blue-900"
                    : isLongStay
                    ? "text-gray-900"
                    : "text-gray-700"
                }`}
              >
                {trip.location}
              </h3>
              <p
                className={`text-sm ${
                  isCurrent
                    ? "text-blue-600"
                    : isLongStay
                    ? "text-gray-600"
                    : "text-gray-500"
                }`}
              >
                {trip.country}
              </p>
            </div>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center space-x-2">
          {isCurrent && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
              Current
            </span>
          )}
          {isLongStay && !isCurrent && (
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
              Extended Stay
            </span>
          )}
          {!isLongStay && !isCurrent && (
            <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-1 rounded-full">
              Travel Stop
            </span>
          )}
        </div>
      </div>

      {/* Details Section */}
      <div className="space-y-2 text-sm">
        {/* Date Range */}
        <div
          className={`flex items-center space-x-2 ${
            isCurrent
              ? "text-blue-600"
              : isLongStay
              ? "text-gray-600"
              : "text-gray-500"
          }`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
          </svg>
          <span>
            {formatDate(trip.arrivalDate)} - {formatDate(trip.departureDate)}
          </span>
        </div>

        {/* Duration and Timezone */}
        <div
          className={`flex items-center space-x-2 ${
            isCurrent
              ? "text-blue-600"
              : isLongStay
              ? "text-gray-600"
              : "text-gray-500"
          }`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
            <path d="m12.5 7-1 1v5.25l3.5 2.08.75-1.23-2.75-1.63z" />
          </svg>
          <span>
            <span
              className={`font-medium ${
                isLongStay ? "text-green-700" : "text-gray-600"
              }`}
            >
              {trip.daysAtPlace} day{trip.daysAtPlace !== 1 ? "s" : ""}
            </span>
            {trip.timeZone && ` • ${trip.timeZone}`}
          </span>
        </div>

        {/* Travel Time (if available) */}
        {trip.travelTimeToHere && (
          <div
            className={`flex items-center space-x-2 ${
              isCurrent
                ? "text-blue-600"
                : isLongStay
                ? "text-gray-600"
                : "text-gray-500"
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z" />
            </svg>
            <span>{trip.travelTimeToHere} travel time</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationCard;
