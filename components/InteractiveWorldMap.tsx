// InteractiveWorldMap.tsx
import React from "react";
import { CountrySVG } from "./CountrySVG";
import type { CountryName } from "./geo-utils";
import type { TravelData } from "@/app/types/Travel-data";

type City = {
  name: string;
  lat: number;
  lon: number;
  isUpcoming: boolean;
  isCurrent: boolean;
  isBooked: boolean; // Add booking status
  isPotential: boolean; // Add potential status
};

// Updated filter type to include potential
export type TimeFilter = "all" | "visited" | "upcoming" | "potential";

// Helper function to determine US region based on coordinates
const getUSRegion = (
  trip: TravelData
): "Continental US" | "Alaska" | "Hawaii" | "United States" => {
  if (!trip.coordinates) return "United States";

  const { lat, lon } = trip.coordinates;

  // Alaska bounds (roughly)
  if (lat > 50 && lon < -129) {
    return "Alaska";
  }

  // Hawaii bounds (roughly)
  if (lat < 25 && lon < -154) {
    return "Hawaii";
  }

  // Continental US (including lower 48 + DC)
  if (trip.country === "United States") {
    return "Continental US";
  }

  return "United States";
};

export function InteractiveWorldMap({
  travelData,
  selectedCountry,
  timeFilter = "all",
  viewBox = "0 0 1000 700",
  className,
}: {
  travelData: TravelData[];
  selectedCountry: string;
  timeFilter?: TimeFilter;
  viewBox?: string;
  className?: string;
}) {
  const today = new Date();

  // Enhanced country mapping with US regions
  const countryMapping: Record<
    string,
    { countryName: CountryName; usLower48?: boolean }
  > = {
    "Continental US": { countryName: "United States", usLower48: true },
    Alaska: { countryName: "United States", usLower48: false },
    Hawaii: { countryName: "United States", usLower48: false },
    "United States": { countryName: "United States", usLower48: false },
    UK: { countryName: "United Kingdom" },
    Scotland: { countryName: "United Kingdom" },
    France: { countryName: "France" },
    Japan: { countryName: "Japan" },
    Greece: { countryName: "Greece" },
    "Costa Rica": { countryName: "Costa Rica" },
    Canada: { countryName: "Canada" },
  };

  const mapping = countryMapping[selectedCountry];
  if (!mapping) {
    return (
      <div className="text-center text-gray-500 p-8">
        <p>Map not available for {selectedCountry}</p>
        <p className="text-sm mt-2">
          Available regions: {Object.keys(countryMapping).join(", ")}
        </p>
      </div>
    );
  }

  // Filter trips based on selected region
  let relevantTrips: TravelData[] = [];

  if (selectedCountry === "Continental US") {
    relevantTrips = travelData.filter(
      (trip) =>
        trip.country === "United States" &&
        getUSRegion(trip) === "Continental US"
    );
  } else if (selectedCountry === "Alaska") {
    relevantTrips = travelData.filter(
      (trip) =>
        trip.country === "United States" && getUSRegion(trip) === "Alaska"
    );
  } else if (selectedCountry === "Hawaii") {
    relevantTrips = travelData.filter(
      (trip) =>
        trip.country === "United States" && getUSRegion(trip) === "Hawaii"
    );
  } else if (selectedCountry === "United States") {
    relevantTrips = travelData.filter(
      (trip) => trip.country === "United States"
    );
  } else {
    // Handle UK/Scotland grouping and other countries
    const relevantCountries =
      selectedCountry === "United Kingdom" ||
      selectedCountry === "UK" ||
      selectedCountry === "Scotland"
        ? ["UK", "Scotland", "United Kingdom"]
        : [selectedCountry];

    relevantTrips = travelData.filter((trip) =>
      relevantCountries.includes(trip.country)
    );
  }

  // Enhanced time filtering with booking status
  const filteredTrips = relevantTrips
    .filter((trip) => trip.coordinates) // Has coordinates
    .filter((trip) => {
      const arrivalDate = new Date(trip.arrivalDate);
      const departureDate = new Date(trip.departureDate);

      // Determine trip status
      const isCurrent = today >= arrivalDate && today <= departureDate;
      const isUpcoming = arrivalDate > today;
      const isVisited = departureDate < today;
      const isBooked = trip.booked === true;

      // Apply enhanced time filter
      switch (timeFilter) {
        case "visited":
          return isVisited;
        case "upcoming":
          return (isUpcoming || isCurrent) && isBooked;
        case "potential":
          return isUpcoming && !isBooked; // Future trips that aren't booked yet
        case "all":
        default:
          return true; // Show everything
      }
    });

  // Extract cities with enhanced metadata
  const traveledCities: City[] = filteredTrips
    .map((trip) => {
      const arrivalDate = new Date(trip.arrivalDate);
      const departureDate = new Date(trip.departureDate);
      const isCurrent = today >= arrivalDate && today <= departureDate;
      const isUpcoming = arrivalDate > today || isCurrent;
      const isBooked = trip.booked === true;
      const isPotential = arrivalDate > today && !isBooked;

      return {
        name: trip.location,
        lat: trip.coordinates!.lon, // Swap these
        lon: trip.coordinates!.lat, // Swap these
        isUpcoming,
        isCurrent,
        isBooked,
        isPotential,
      };
    })
    // Remove duplicates based on city name
    .filter(
      (city, index, self) =>
        index === self.findIndex((c) => c.name === city.name)
    );

  // Enhanced empty state messages
  if (traveledCities.length === 0) {
    const getFilterMessage = (
      filter: TimeFilter
    ): { title: string; description: string } => {
      switch (filter) {
        case "visited":
          return {
            title: `No cities visited in ${selectedCountry}`,
            description: `No completed trips found for ${selectedCountry}`,
          };
        case "upcoming":
          return {
            title: `No upcoming booked trips in ${selectedCountry}`,
            description: `No confirmed future trips planned for ${selectedCountry}`,
          };
        case "potential":
          return {
            title: `No potential destinations in ${selectedCountry}`,
            description: `No unbooked future trips planned for ${selectedCountry}`,
          };
        default:
          return {
            title: `No cities found for ${selectedCountry}`,
            description:
              selectedCountry === "Alaska" || selectedCountry === "Hawaii"
                ? `No travel data found for ${selectedCountry} yet`
                : "Add coordinates to travel-data.json for cities in this region",
          };
      }
    };

    const message = getFilterMessage(timeFilter);

    return (
      <div className="text-center text-gray-500 p-8">
        <p className="font-medium">{message.title}</p>
        <p className="text-sm mt-2">{message.description}</p>
      </div>
    );
  }

  // Special handling for Alaska and Hawaii
  if (selectedCountry === "Alaska" || selectedCountry === "Hawaii") {
    return (
      <div className="p-8">
        <h5 className="text-lg font-semibold mb-4">
          Cities in {selectedCountry}
        </h5>
        <div className="space-y-2">
          {traveledCities.map((city, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    city.isCurrent
                      ? "bg-blue-500"
                      : city.isPotential
                      ? "bg-orange-500"
                      : city.isUpcoming
                      ? "bg-green-500"
                      : "bg-gray-400"
                  }`}
                />
                <span className="font-medium">{city.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                {city.isCurrent && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    Current
                  </span>
                )}
                {city.isPotential && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                    Potential
                  </span>
                )}
                {city.isUpcoming && city.isBooked && !city.isCurrent && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Upcoming
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Display filter info */}
      <div className="mb-4 text-sm text-gray-600">
        <p>
          Showing {traveledCities.length}{" "}
          {timeFilter === "all" ? "" : timeFilter} cities in {selectedCountry}
          {traveledCities.length > 0 && (
            <span className="ml-2 text-xs">
              ({filteredTrips.length} trip
              {filteredTrips.length !== 1 ? "s" : ""})
            </span>
          )}
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 mb-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
          <span>Visited</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
          <span>Current</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>Upcoming (Booked)</span>
        </div>
        {/* ADD THIS MISSING LEGEND ITEM */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
          <span>Potential</span>
        </div>
        <div className="text-gray-500 text-xs">
          💡 Use mouse wheel to zoom • Drag to pan • Use controls to reset
        </div>
      </div>

      {/* Map Component with render prop for cities */}
      <CountrySVG
        country={mapping.countryName}
        viewBox={viewBox}
        className="w-full h-full"
        usLower48={mapping.usLower48}
        enableZoom={true}
      >
        {({ project }) => (
          <>
            {traveledCities.map((city, index) => {
              // Try both coordinate orders to handle potential data inconsistencies
              const [x1, y1] = project(city.lon, city.lat); // lon, lat order
              const [x2, y2] = project(city.lat, city.lon); // lat, lon order

              // Use whichever projection gives valid results
              const [x, y] = !isNaN(x1) && !isNaN(y1) ? [x1, y1] : [x2, y2];

              // Skip if both projections are invalid
              if (isNaN(x) || isNaN(y)) {
                return null;
              }

              return (
                <g key={`${city.name}-${index}`}>
                  {/* City marker circle */}
                  <circle
                    cx={x}
                    cy={y}
                    r={city.isCurrent ? 8 : 6}
                    fill={
                      city.isCurrent
                        ? "#3B82F6" // Blue for current
                        : city.isPotential
                        ? "#F97316" // Orange for potential
                        : city.isUpcoming && city.isBooked
                        ? "#10B981" // Green for upcoming booked
                        : "#6B7280" // Gray for visited
                    }
                    stroke="white"
                    strokeWidth={2}
                    className="transition-all duration-200 hover:r-10 cursor-pointer"
                    style={{
                      filter: city.isCurrent
                        ? "drop-shadow(0 0 6px rgba(59, 130, 246, 0.6))"
                        : "none",
                    }}
                  />

                  {/* City label */}
                  <text
                    x={x}
                    y={y - 12}
                    textAnchor="middle"
                    className="text-xs font-medium fill-gray-800 pointer-events-none"
                    style={{
                      filter: "drop-shadow(0 1px 2px rgba(255, 255, 255, 0.8))",
                    }}
                  >
                    {city.name}
                  </text>

                  {/* Status indicator for special cases */}
                  {city.isCurrent && (
                    <circle
                      cx={x + 8}
                      cy={y - 8}
                      r={3}
                      fill="#EF4444"
                      stroke="white"
                      strokeWidth={1}
                      className="animate-pulse"
                    />
                  )}

                  {city.isPotential && (
                    <circle
                      cx={x + 6}
                      cy={y - 6}
                      r={2}
                      fill="#F59E0B"
                      stroke="white"
                      strokeWidth={1}
                    />
                  )}
                </g>
              );
            })}
          </>
        )}
      </CountrySVG>
    </div>
  );
}
