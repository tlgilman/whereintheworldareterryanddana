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
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <span className={`text-2xl ${iconColor} mr-3`}>{icon}</span>
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <span className="ml-3 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
            {trips.length}
          </span>
        </div>

        {trips.length > 6 && (
          <button
            onClick={onToggle}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            {showAll ? "Show Less" : `Show All ${trips.length}`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayTrips.map((trip, index) => (
          <LocationCard
            key={`${trip.location}-${trip.arrivalDate}-${index}`}
            trip={trip}
            isCurrent={title.includes("Where We Are Now")}
          />
        ))}
      </div>
    </div>
  );
};

export default TravelSection;
