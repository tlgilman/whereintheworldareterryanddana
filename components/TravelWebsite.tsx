"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  MapPin,
  Clock,
  Globe,
  Users,
  ChevronRight,
} from "lucide-react";

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

const TravelWebsite = () => {
  const [travelData, setTravelData] = useState<TravelData[]>([]);
  const [currentLocation, setCurrentLocation] = useState<TravelData | null>(
    null
  );
  const [upcomingLocations, setUpcomingLocations] = useState<TravelData[]>([]);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  useEffect(() => {
    // Fetch from your JSON file
    fetch("/travel-data.json")
      .then((res) => res.json())
      .then((data) => {
        console.log("Loaded travel data:", data);
        setTravelData(data);
      })
      .catch((error) => {
        console.error("Error loading travel data:", error);
      });
  }, []);

  useEffect(() => {
    if (travelData.length > 0) {
      const today = new Date();
      const current = travelData.find((trip) => {
        const arrival = new Date(trip.arrivalDate);
        const departure = new Date(trip.departureDate);
        return today >= arrival && today <= departure;
      });

      const upcoming = travelData.filter((trip) => {
        const arrival = new Date(trip.arrivalDate);
        return arrival > today;
      });

      setCurrentLocation(current ?? null);
      setUpcomingLocations(upcoming);
    }
  }, [travelData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const LocationCard = ({
    trip,
    isCurrent = false,
  }: {
    trip: TravelData;
    isCurrent?: boolean;
  }) => {
    const isLongStay = trip.daysAtPlace >= 5;

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
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              {isLongStay ? (
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-3 h-3 text-green-600" />
                </div>
              ) : (
                <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-3 h-3 text-gray-500" />
                </div>
              )}
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

        <div className="space-y-2 text-sm">
          <div
            className={`flex items-center space-x-2 ${
              isCurrent
                ? "text-blue-600"
                : isLongStay
                ? "text-gray-600"
                : "text-gray-500"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>
              {formatDate(trip.arrivalDate)} - {formatDate(trip.departureDate)}
            </span>
          </div>

          <div
            className={`flex items-center space-x-2 ${
              isCurrent
                ? "text-blue-600"
                : isLongStay
                ? "text-gray-600"
                : "text-gray-500"
            }`}
          >
            <Clock className="w-4 h-4" />
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
              <Globe className="w-4 h-4" />
              <span>{trip.travelTimeToHere} travel time</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Our Digital Nomad Journey
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Follow along as we explore the world, moving every 1-3 months to
              new destinations. Here&apos;s where we&apos;ve been and where
              we&apos;re heading next!
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Current Location */}
        {currentLocation && (
          <section className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <MapPin className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Currently In</h2>
            </div>
            <LocationCard trip={currentLocation} isCurrent={true} />
          </section>
        )}

        {/* Upcoming Locations */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl font-bold text-gray-900">
                {showAllUpcoming ? "All Upcoming Destinations" : "Coming Up"}
              </h2>
            </div>
            {upcomingLocations.length > 4 && (
              <button
                onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <span>{showAllUpcoming ? "Show Less" : "View All"}</span>
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${
                    showAllUpcoming ? "rotate-90" : ""
                  }`}
                />
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {(showAllUpcoming
              ? upcomingLocations
              : upcomingLocations.slice(0, 4)
            ).map((trip, index) => (
              <LocationCard key={index} trip={trip} />
            ))}
          </div>

          {upcomingLocations.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No upcoming destinations planned yet.</p>
            </div>
          )}
        </section>

        {/* Stats Summary */}
        <section className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Journey Stats
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {travelData.length}
              </div>
              <div className="text-sm text-gray-600">Destinations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {travelData.reduce((sum, trip) => sum + trip.daysAtPlace, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(travelData.map((trip) => trip.country)).size}
              </div>
              <div className="text-sm text-gray-600">Countries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {upcomingLocations.length}
              </div>
              <div className="text-sm text-gray-600">Upcoming</div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 text-center border">
          <div className="flex items-center justify-center space-x-2 mb-3">
            <Users className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">
              Want to Join Us?
            </h3>
          </div>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            Planning to be in one of our upcoming destinations? Let us know -
            we&apos;d love to meet up!
          </p>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
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
    </div>
  );
};

export default TravelWebsite;
