"use client";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TravelData, getCurrentLocation } from "../types/Travel-data";
import {
  InteractiveWorldMap,
  type TimeFilter,
} from "@/components/InteractiveWorldMap";
import { useTravelData } from "@/hooks/useTravelData";

export default function MapPage() {
  // Use the custom hook
  const { travelData, loading, error } = useTravelData({ source: "local" });

  const [currentLocation, setCurrentLocation] = useState<TravelData | null>(
    null
  );
  console.log(currentLocation);
  const [selectedCountry, setSelectedCountry] =
    useState<string>("Continental US");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  // Update derived state when travel data changes
  useEffect(() => {
    if (travelData.length > 0) {
      const current = getCurrentLocation(travelData);
      setCurrentLocation(current);
    }
  }, [travelData]);

  // Get unique countries from travel data with US regions separated
  const visitedCountries = useMemo(() => {
    const countrySet = new Set<string>();

    travelData.forEach((trip) => {
      if (trip.country === "United States" && trip.coordinates) {
        const { lat, lon } = trip.coordinates;

        // Alaska bounds
        if (lat > 50 && lon < -129) {
          countrySet.add("Alaska");
        }
        // Hawaii bounds
        else if (lat < 25 && lon < -154) {
          countrySet.add("Hawaii");
        }
        // Continental US
        else {
          countrySet.add("Continental US");
        }
      } else {
        countrySet.add(trip.country);
      }
    });

    const countries = Array.from(countrySet);

    // Sort with Continental US first, then Alaska, Hawaii, then alphabetically
    return countries.sort((a, b) => {
      if (a === "Continental US") return -1;
      if (b === "Continental US") return 1;
      if (a === "Alaska") return -1;
      if (b === "Alaska") return 1;
      if (a === "Hawaii") return -1;
      if (b === "Hawaii") return 1;
      return a.localeCompare(b);
    });
  }, [travelData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map data...</p>
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
          <Link
            href="/"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Back Button */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </Link>
            <div className="border-l border-gray-300 h-6"></div>
            <h1 className="text-2xl font-bold text-gray-900">
              Where We&apos;ve Been
            </h1>
          </div>
        </div>
      </header>

      {/* Map Section */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        {/* Country Navigation */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Select a Country or Region
          </h2>
          <div className="flex flex-wrap gap-2">
            {visitedCountries.map((country) => (
              <button
                key={country}
                onClick={() => setSelectedCountry(country)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCountry === country
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                }`}
              >
                {country}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Map */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Cities in {selectedCountry}
              </h3>

              {/* Time Filter Tabs */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setTimeFilter("all")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    timeFilter === "all"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  All Cities
                </button>
                <button
                  onClick={() => setTimeFilter("visited")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    timeFilter === "visited"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Visited
                </button>
                <button
                  onClick={() => setTimeFilter("upcoming")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    timeFilter === "upcoming"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Upcoming
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-6 mb-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Visited</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span>Current</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Upcoming</span>
              </div>
              <div className="text-gray-500 text-xs">
                💡 Use mouse wheel to zoom • Drag to pan • Use controls to reset
              </div>
            </div>

            {/* Map Container */}
            <div className="w-full" style={{ height: "600px" }}>
              <InteractiveWorldMap
                travelData={travelData}
                selectedCountry={selectedCountry}
                timeFilter={timeFilter}
                className="w-full h-full"
                viewBox="0 0 1000 600"
              />
            </div>
          </div>
        </div>

        {/* Mobile Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">How to Use the Map</h4>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>
              • <strong>Zoom:</strong> Use the + and - buttons or mouse wheel
            </li>
            <li>
              • <strong>Pan:</strong> Click and drag to move around
            </li>
            <li>
              • <strong>Reset:</strong> Click the reset button to return to full
              view
            </li>
            <li>
              • <strong>Filter:</strong> Use the tabs above to filter by time
              period
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
