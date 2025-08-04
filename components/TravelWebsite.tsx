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
  travelTime: string;
  timeZone: string;
  arrivalDate: string;
  departureDate: string;
  daysAtPlace: number;
}

// Mock data based on your JSON structure - replace with actual data fetch
const mockTravelData: TravelData[] = [
  {
    location: "Allen, Tx",
    country: "United States",
    travelTime: "",
    timeZone: "CDT (UTC−5) *",
    arrivalDate: "2025-01-01",
    departureDate: "2025-01-18",
    daysAtPlace: 15,
  },
  {
    location: "San Antonio, TX ",
    country: "United States",
    travelTime: "4 hours 36 mins *",
    timeZone: "CDT (UTC−5) *",
    arrivalDate: "2025-01-18",
    departureDate: "2025-02-16",
    daysAtPlace: 27,
  },
  {
    location: "New Orleans, MS ",
    country: "United States",
    travelTime: "8 hours 6 mins *",
    timeZone: "CDT (UTC−5) *",
    arrivalDate: "2025-02-16",
    departureDate: "2025-05-31",
    daysAtPlace: 102,
  },
  {
    location: "North Padre Island, TX",
    country: "United States",
    travelTime: "9 hours 5 mins *",
    timeZone: "CDT (UTC−5) *",
    arrivalDate: "2025-07-12",
    departureDate: "2025-09-21",
    daysAtPlace: 69,
  },
  {
    location: "Allen, TX",
    country: "United States",
    travelTime: "6 hours 53 mins *",
    timeZone: "CDT (UTC−5) *",
    arrivalDate: "2025-09-21",
    departureDate: "2025-09-26",
    daysAtPlace: 3,
  },
  {
    location: "Amarillo, Tx",
    country: "United States",
    travelTime: "5 hours 39 mins *",
    timeZone: "CDT (UTC−5) *",
    arrivalDate: "2025-09-26",
    departureDate: "2025-09-27",
    daysAtPlace: 1,
  },
  {
    location: "Albuquerque, NM",
    country: "United States",
    travelTime: "4 hours 13 mins *",
    timeZone: "MDT (UTC−6) *",
    arrivalDate: "2025-09-27",
    departureDate: "2025-11-23",
    daysAtPlace: 55,
  },
  {
    location: "Allen, Tx",
    country: "United States",
    travelTime: "9 hours 44 mins *",
    timeZone: "CDT (UTC−5) *",
    arrivalDate: "2025-11-23",
    departureDate: "2025-11-27",
    daysAtPlace: 2,
  },
  {
    location: "Mobile, AL",
    country: "United States",
    travelTime: "9 hours 19 mins *",
    timeZone: "CDT (UTC−5) *",
    arrivalDate: "2025-11-27",
    departureDate: "2025-11-28",
    daysAtPlace: 1,
  },
  {
    location: "Tampa, FL",
    country: "United States",
    travelTime: "7 hours 22 mins *",
    timeZone: "EDT (UTC−4) *",
    arrivalDate: "2025-11-28",
    departureDate: "2025-11-30",
    daysAtPlace: 1,
  },
  {
    location: "Key Largo, FL",
    country: "United States",
    travelTime: "4 hours 53 mins *",
    timeZone: "EDT (UTC−4) *",
    arrivalDate: "2025-11-30",
    departureDate: "2026-01-24",
    daysAtPlace: 53,
  },
  {
    location: "Orlando",
    country: "United States",
    travelTime: "4 hours 29 mins *",
    timeZone: "EDT (UTC−4) *",
    arrivalDate: "2026-01-24",
    departureDate: "2026-03-01",
    daysAtPlace: 34,
  },
  {
    location: "Ashville, NC",
    country: "United States",
    travelTime: "8 hours 26 mins *",
    timeZone: "EDT (UTC−4) *",
    arrivalDate: "2026-03-01",
    departureDate: "2026-05-23",
    daysAtPlace: 81,
  },
  {
    location: "Athens, Greece",
    country: "Greece",
    travelTime: "Flying: 11h 1m *",
    timeZone: "EEST (UTC+3) *",
    arrivalDate: "2026-05-23",
    departureDate: "2026-06-27",
    daysAtPlace: 33,
  },
  {
    location: "Greenville, SC",
    country: "United States",
    travelTime: "Flying: 11h 4m *",
    timeZone: "EDT (UTC−4) *",
    arrivalDate: "2026-06-27",
    departureDate: "2026-07-01",
    daysAtPlace: 2,
  },
  {
    location: "Portland, Maine",
    country: "United States",
    travelTime: "15 hours 56 mins *",
    timeZone: "EDT (UTC−4) *",
    arrivalDate: "2026-07-01",
    departureDate: "2026-08-31",
    daysAtPlace: 59,
  },
  {
    location: "Ithaca, NY",
    country: "United States",
    travelTime: "6 hours 55 mins *",
    timeZone: "EDT (UTC−4) *",
    arrivalDate: "2026-08-31",
    departureDate: "2026-10-26",
    daysAtPlace: 54,
  },
  {
    location: "New York City, NY",
    country: "United States",
    travelTime: "4 hours 0 mins *",
    timeZone: "EDT (UTC−4) *",
    arrivalDate: "2026-10-26",
    departureDate: "2026-12-31",
    daysAtPlace: 64,
  },
  {
    location: "Washington DC",
    country: "United States",
    travelTime: "3 hours 56 mins *",
    timeZone: "EDT (UTC−4) *",
    arrivalDate: "2026-12-31",
    departureDate: "2027-02-06",
    daysAtPlace: 35,
  },
  {
    location: "Chicago, Il",
    country: "United States",
    travelTime: "10 hours 49 mins *",
    timeZone: "CDT (UTC−5) *",
    arrivalDate: "2027-02-06",
    departureDate: "2027-03-28",
    daysAtPlace: 48,
  },
  {
    location: "Brainerd, Minnesota",
    country: "United States",
    travelTime: "8 hours 8 mins *",
    timeZone: "CDT (UTC−5) *",
    arrivalDate: "2027-03-28",
    departureDate: "2027-05-01",
    daysAtPlace: 32,
  },
  {
    location: "Yellowstone, Wyoming",
    country: "United States",
    travelTime: "14 hours 40 mins *",
    timeZone: "MDT (UTC−6) *",
    arrivalDate: "2027-05-01",
    departureDate: "2027-06-05",
    daysAtPlace: 33,
  },
  {
    location: "Provo, Utah",
    country: "United States",
    travelTime: "6 hours 27 mins *",
    timeZone: "MDT (UTC−6) *",
    arrivalDate: "2027-06-05",
    departureDate: "2027-07-31",
    daysAtPlace: 54,
  },
  {
    location: "Steamboat Springs, Co",
    country: "United States",
    travelTime: "5 hours 23 mins *",
    timeZone: "MDT (UTC−6) *",
    arrivalDate: "2027-07-31",
    departureDate: "2027-10-02",
    daysAtPlace: 61,
  },
  {
    location: "Palms Springs, Ca",
    country: "United States",
    travelTime: "14 hours 24 mins *",
    timeZone: "PDT (UTC−7) *",
    arrivalDate: "2027-10-02",
    departureDate: "2027-12-04",
    daysAtPlace: 61,
  },
  {
    location: "Sacremento,Ca",
    country: "United States",
    travelTime: "7 hours 33 mins *",
    timeZone: "PDT (UTC−7) *",
    arrivalDate: "2027-12-04",
    departureDate: "2028-02-05",
    daysAtPlace: 61,
  },
  {
    location: "Portland, Oregon",
    country: "United States",
    travelTime: "8 hours 55 mins *",
    timeZone: "PDT (UTC−7) *",
    arrivalDate: "2028-03-25",
    departureDate: "2028-04-30",
    daysAtPlace: 34,
  },
  {
    location: "Seattle, Washington",
    country: "United States",
    travelTime: "2 hours 46 mins *",
    timeZone: "PDT (UTC−7) *",
    arrivalDate: "2028-04-30",
    departureDate: "2028-06-24",
    daysAtPlace: 53,
  },
  {
    location: "Vancover, BC",
    country: "Canada",
    travelTime: "2 hours 37 mins *",
    timeZone: "PDT (UTC−7) *",
    arrivalDate: "2028-06-24",
    departureDate: "2028-08-26",
    daysAtPlace: 61,
  },
  {
    location: "Kamloop, BC",
    country: "Canada",
    travelTime: "3 hours 42 mins *",
    timeZone: "PDT (UTC−7) *",
    arrivalDate: "2028-08-26",
    departureDate: "2028-10-28",
    daysAtPlace: 61,
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
