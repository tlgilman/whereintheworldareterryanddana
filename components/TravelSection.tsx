import React from "react";
import { TravelData } from "@/app/types/Travel-data";
import LocationCard from "./LocationCard"; // Changed to default import

interface TravelSectionProps {
  title: string;
  trips: TravelData[];
  showAll: boolean;
  onToggle: () => void;
  emptyMessage: string;
  iconColor: string;
  icon: string;
}

export const TravelSection: React.FC<TravelSectionProps> = ({
  title,
  trips,
  showAll,
  onToggle,
  emptyMessage,
  iconColor,
  icon,
}) => {
  const displayTrips = showAll ? trips : trips.slice(0, 6);

  if (trips.length === 0 && emptyMessage) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <div className={`text-4xl ${iconColor} mb-4`}>{icon}</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="flex items-center justify-between p-6 pb-6">
        <div className="flex items-center">
          <span className={`text-2xl ${iconColor} mr-3`}>{icon}</span>
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <span className="ml-3 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
            {trips.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-6">
        {displayTrips.map((trip, index) => (
          <LocationCard
            key={`${trip.location}-${trip.arrivalDate}-${index}`}
            trip={trip}
            isCurrent={title.includes("Where We Are Now")}
          />
        ))}
      </div>

      {trips.length > 6 && (
        <button
          onClick={onToggle}
          className="w-full mt-6 py-3 flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 border-t text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
        >
          {showAll ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Show Less
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Show All {trips.length}
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default TravelSection;
