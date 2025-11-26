"use client";

import React, { useState, useEffect } from "react";
import {
  calculateStats,
  organizeTravelData,
  OrganizedTravelData,
} from "./types/Travel-data";
import { useTravelData } from "@/hooks/useTravelData";
import TravelWebsite from "@/components/TravelWebsite";

const App: React.FC = () => {
  const { travelData, loading, error } = useTravelData({ source: "api" });

  const [organizedData, setOrganizedData] = useState<OrganizedTravelData>({
    alreadyTraveled: [],
    currentLocation: null,
    upcomingTrips: [],
    potentialTrips: [],
  });

  const [showAllAlreadyTraveled, setShowAllAlreadyTraveled] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showAllPotential, setShowAllPotential] = useState(false);
  const [showAllJourney, setShowAllJourney] = useState(false);

  useEffect(() => {
    if (travelData.length > 0) {
      const organized = organizeTravelData(travelData);
      setOrganizedData(organized);
    }
  }, [travelData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading travel data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Oops! Something went wrong
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const stats = calculateStats(travelData);

  return (
    <TravelWebsite
      currentLocation={organizedData.currentLocation}
      stats={stats}
      alreadyTraveled={organizedData.alreadyTraveled}
      upcomingTrips={organizedData.upcomingTrips}
      potentialTrips={organizedData.potentialTrips}
      showAllAlreadyTraveled={showAllAlreadyTraveled}
      showAllUpcoming={showAllUpcoming}
      showAllPotential={showAllPotential}
      showAllJourney={showAllJourney}
      onToggleAlreadyTraveled={() =>
        setShowAllAlreadyTraveled(!showAllAlreadyTraveled)
      }
      onToggleUpcoming={() => setShowAllUpcoming(!showAllUpcoming)}
      onTogglePotential={() => setShowAllPotential(!showAllPotential)}
      onToggleJourney={() => setShowAllJourney(!showAllJourney)}
    />
  );
};

export default App;
