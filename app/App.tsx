import React, { useState, useEffect } from "react";
import HeroSection from "@/components/HeroSection";
import LocationCard from "@/components/LocationCard";
import {
  TravelData,
  Stats,
  getCurrentLocation,
  getUpcomingLocations,
  calculateStats,
} from "./types/Travel-data";

const App: React.FC = () => {
  const [travelData, setTravelData] = useState<TravelData[]>([]);
  const [currentLocation, setCurrentLocation] = useState<TravelData | null>(
    null
  );
  const [upcomingLocations, setUpcomingLocations] = useState<TravelData[]>([]);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [stats, setStats] = useState<Stats>({
    countries: 0,
    destinations: 0,
    totalDays: 0,
    upcoming: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  // Load travel data on component mount
  useEffect(() => {
    const loadTravelData = async () => {
      try {
        setLoading(true);

        // Option 1: Load from JSON file
        const response = await fetch("/travel-data.json");
        if (!response.ok) {
          throw new Error("Failed to load travel data");
        }
        const data: TravelData[] = await response.json();

        setTravelData(data);
        console.log("Loaded travel data:", data);
      } catch (err) {
        console.error("Error loading travel data:", err);
        setError("Failed to load travel data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadTravelData();
  }, []);

  // Update derived state when travel data changes
  useEffect(() => {
    if (travelData.length > 0) {
      const current = getCurrentLocation(travelData);
      const upcoming = getUpcomingLocations(travelData);
      const calculatedStats = calculateStats(travelData);

      setCurrentLocation(current);
      setUpcomingLocations(upcoming);
      setStats(calculatedStats);
    }
  }, [travelData]);

  // Loading state
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

  // Error state
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <HeroSection currentLocation={currentLocation} stats={stats} />

      {/* Main Content */}
      <main id="main-content" className="max-w-4xl mx-auto px-4 py-12">
        {/* Current Location Section */}
        {currentLocation && (
          <section className="mb-12">
            <div className="flex items-center space-x-2 mb-6">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <h2 className="text-3xl font-bold text-gray-900">Currently In</h2>
            </div>
            <LocationCard trip={currentLocation} isCurrent={true} />
          </section>
        )}

        {/* Upcoming Locations Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <svg
                className="w-6 h-6 text-gray-700"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
              </svg>
              <h2 className="text-3xl font-bold text-gray-900">
                {showAllUpcoming ? "All Upcoming Destinations" : "Coming Up"}
              </h2>
            </div>
            {upcomingLocations.length > 4 && (
              <button
                onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <span>{showAllUpcoming ? "Show Less" : "View All"}</span>
                <svg
                  className={`w-4 h-4 transition-transform ${
                    showAllUpcoming ? "rotate-90" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {(showAllUpcoming
              ? upcomingLocations
              : upcomingLocations.slice(0, 4)
            ).map((trip) => (
              <LocationCard
                key={`${trip.location}-${trip.arrivalDate}`}
                trip={trip}
              />
            ))}
          </div>

          {upcomingLocations.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-gray-300"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
              </svg>
              <p>No upcoming destinations planned yet.</p>
            </div>
          )}
        </section>

        {/* Journey Stats Section */}
        <section className="bg-white rounded-lg p-6 border mb-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Journey Stats
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.destinations}
              </div>
              <div className="text-sm text-gray-600">Destinations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.totalDays}
              </div>
              <div className="text-sm text-gray-600">Total Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.countries}
              </div>
              <div className="text-sm text-gray-600">Countries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.upcoming}
              </div>
              <div className="text-sm text-gray-600">Upcoming</div>
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 text-center border">
          <div className="flex items-center justify-center space-x-2 mb-3">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H17c-.8 0-1.5.7-1.5 1.5v9c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5V15h1v5h1zm-8.5-10c.8 0 1.5-.7 1.5-1.5V9c0-.8-.7-1.5-1.5-1.5h-3C8.7 7.5 8 8.2 8 9v1.5c0 .8.7 1.5 1.5 1.5H11zm-6 0c.8 0 1.5-.7 1.5-1.5V9c0-.8-.7-1.5-1.5-1.5S4 8.2 4 9v1.5C4 11.3 4.7 12 5.5 12z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900">
              Want to Join Us?
            </h3>
          </div>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            Planning to be in one of our upcoming destinations? Let us know - we
            would love to meet up!
          </p>
          <button
            onClick={() => setShowContactModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Get In Touch
          </button>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-gray-600">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <p className="text-sm mt-1">
            Data synced from our travel planning system
          </p>
        </div>
      </footer>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in duration-200">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ×
            </button>
            <div className="text-center">
              <div className="text-4xl mb-4">🌍</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Let&apos;s Meet Up!
              </h3>
              <p className="text-gray-600 mb-6">
                Great! You know how to reach us. Let us know where you want to
                meet us.
              </p>
              <button
                onClick={() => setShowContactModal(false)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
