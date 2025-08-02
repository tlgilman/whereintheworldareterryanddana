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
  travelTime: string;
  timeZone: string;
  arrivalDate: string;
  departureDate: string;
  daysAtPlace: number;
}

// Mock data based on your JSON structure - replace with actual data fetch
const mockTravelData: TravelData[] = [
  {
    location: "Calgary, AB",
    country: "Canada",
    travelTime: "10 hr",
    timeZone: "MDT (UTC-6)",
    arrivalDate: "2025-07-01",
    departureDate: "2025-08-15",
    daysAtPlace: 46,
  },
  {
    location: "Vancouver, BC",
    country: "Canada",
    travelTime: "12 hr",
    timeZone: "PDT (UTC-7)",
    arrivalDate: "2025-08-16",
    departureDate: "2025-09-30",
    daysAtPlace: 45,
  },
  {
    location: "Portland, OR",
    country: "United States",
    travelTime: "5 hr",
    timeZone: "PDT (UTC-7)",
    arrivalDate: "2025-10-01",
    departureDate: "2025-11-15",
    daysAtPlace: 45,
  },
  {
    location: "Austin, TX",
    country: "United States",
    travelTime: "18 hr",
    timeZone: "CDT (UTC-5)",
    arrivalDate: "2025-11-16",
    departureDate: "2025-12-31",
    daysAtPlace: 45,
  },
];

const TravelWebsite = () => {
  const [travelData, setTravelData] = useState<TravelData[]>([]);
  const [currentLocation, setCurrentLocation] = useState<TravelData | null>(
    null
  );
  const [upcomingLocations, setUpcomingLocations] = useState<TravelData[]>([]);

  useEffect(() => {
    // In real implementation, fetch from your JSON file
    // fetch('/travel-data.json').then(res => res.json()).then(setTravelData);
    setTravelData(mockTravelData);
  }, []);

  useEffect(() => {
    if (travelData.length > 0) {
      const today = new Date();
      const current = travelData.find((trip) => {
        const arrival = new Date(trip.arrivalDate);
        const departure = new Date(trip.departureDate);
        return today >= arrival && today <= departure;
      });

      const upcoming = travelData
        .filter((trip) => {
          const arrival = new Date(trip.arrivalDate);
          return arrival > today;
        })
        .slice(0, 4);

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

  //   const getLocationStatus = (trip) => {
  //     const today = new Date();
  //     const arrival = new Date(trip.arrivalDate);
  //     const departure = new Date(trip.departureDate);

  //     if (today >= arrival && today <= departure) return 'current';
  //     if (arrival > today) return 'upcoming';
  //     return 'past';
  //   };

  const LocationCard = ({
    trip,
    isCurrent = false,
  }: {
    trip: TravelData;
    isCurrent?: boolean;
  }) => {
    return (
      <div
        className={`rounded-lg p-4 border transition-all duration-200 hover:shadow-md ${
          isCurrent
            ? "bg-blue-50 border-blue-200 shadow-sm"
            : "bg-white border-gray-200 hover:border-gray-300"
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <MapPin
              className={`w-5 h-5 ${
                isCurrent ? "text-blue-600" : "text-gray-600"
              }`}
            />
            <div>
              <h3 className="font-semibold text-gray-900">{trip.location}</h3>
              <p className="text-sm text-gray-600">{trip.country}</p>
            </div>
          </div>
          {isCurrent && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
              Current
            </span>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>
              {formatDate(trip.arrivalDate)} - {formatDate(trip.departureDate)}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <span>
              {trip.daysAtPlace} days • {trip.timeZone}
            </span>
          </div>

          {trip.travelTime && (
            <div className="flex items-center space-x-2 text-gray-600">
              <Globe className="w-4 h-4" />
              <span>{trip.travelTime} travel time</span>
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
              <h2 className="text-2xl font-bold text-gray-900">Coming Up</h2>
            </div>
            <button className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium">
              <span>View All</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {upcomingLocations.map((trip, index) => (
              <LocationCard key={index} trip={trip} />
            ))}
          </div>
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
