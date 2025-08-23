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
};
export type TimeFilter = "visited" | "upcoming" | "all";

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
    // Show only continental US cities
    relevantTrips = travelData.filter(
      (trip) =>
        trip.country === "United States" &&
        getUSRegion(trip) === "Continental US"
    );
  } else if (selectedCountry === "Alaska") {
    // Show only Alaska cities
    relevantTrips = travelData.filter(
      (trip) =>
        trip.country === "United States" && getUSRegion(trip) === "Alaska"
    );
  } else if (selectedCountry === "Hawaii") {
    // Show only Hawaii cities
    relevantTrips = travelData.filter(
      (trip) =>
        trip.country === "United States" && getUSRegion(trip) === "Hawaii"
    );
  } else if (selectedCountry === "United States") {
    // Show all US cities (fallback)
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

  // Apply time filtering and coordinate filtering
  const filteredTrips = relevantTrips
    .filter((trip) => trip.coordinates) // Has coordinates
    .filter((trip) => {
      const arrivalDate = new Date(trip.arrivalDate);
      const departureDate = new Date(trip.departureDate);

      // Determine if trip is current, past, or future
      const isCurrent = today >= arrivalDate && today <= departureDate;
      const isUpcoming = arrivalDate > today;
      const isVisited = departureDate < today;

      // Apply time filter
      if (timeFilter === "visited") return isVisited;
      if (timeFilter === "upcoming") return isUpcoming || isCurrent;
      return true; // "all" shows everything
    });

  // Extract cities with additional metadata
  const traveledCities: City[] = filteredTrips
    .map((trip) => {
      const arrivalDate = new Date(trip.arrivalDate);
      const departureDate = new Date(trip.departureDate);
      const isCurrent = today >= arrivalDate && today <= departureDate;
      const isUpcoming = arrivalDate > today || isCurrent;

      return {
        name: trip.location,
        lat: trip.coordinates!.lat,
        lon: trip.coordinates!.lon,
        isUpcoming,
        isCurrent,
      };
    })
    // Remove duplicates based on city name
    .filter(
      (city, index, self) =>
        index === self.findIndex((c) => c.name === city.name)
    );

  if (traveledCities.length === 0) {
    const filterText =
      timeFilter === "visited"
        ? "visited"
        : timeFilter === "upcoming"
        ? "upcoming"
        : "";

    return (
      <div className="text-center text-gray-500 p-8">
        <p>
          No {filterText} cities found for {selectedCountry}
        </p>
        <p className="text-sm mt-2">
          {timeFilter === "visited"
            ? `No cities visited in the past for ${selectedCountry}`
            : timeFilter === "upcoming"
            ? `No upcoming or current cities planned for ${selectedCountry}`
            : selectedCountry === "Alaska" || selectedCountry === "Hawaii"
            ? `No travel data found for ${selectedCountry} yet`
            : "Add coordinates to travel-data.json for cities in this region"}
        </p>
      </div>
    );
  }

  // Special handling for Alaska and Hawaii
  if (selectedCountry === "Alaska" || selectedCountry === "Hawaii") {
    // For now, show a simplified view with city list since geographic boundaries might not render well
    return (
      <div className="p-8">
        <h5 className="text-lg font-semibold mb-4">
          Cities in {selectedCountry}
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {traveledCities.map((city) => (
            <div
              key={city.name}
              className={`p-4 rounded-lg border-2 ${
                city.isCurrent
                  ? "bg-red-50 border-red-200"
                  : city.isUpcoming
                  ? "bg-green-50 border-green-200"
                  : "bg-blue-50 border-blue-200"
              }`}
            >
              <h6 className="font-semibold">{city.name}</h6>
              <p className="text-sm text-gray-600">
                Lat: {city.lat.toFixed(4)}, Lon: {city.lon.toFixed(4)}
              </p>
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  city.isCurrent
                    ? "bg-red-100 text-red-800"
                    : city.isUpcoming
                    ? "bg-green-100 text-green-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {city.isCurrent
                  ? "Current"
                  : city.isUpcoming
                  ? "Upcoming"
                  : "Visited"}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Regular map view for Continental US and other countries
  return (
    <CountrySVG
      country={mapping.countryName}
      viewBox={viewBox}
      className={className}
      fill="#F0F9FF"
      stroke="#3B82F6"
      strokeWidth={1}
      opacity={0.95}
      usLower48={mapping.usLower48 || false}
      enableZoom={true} // Enable zoom functionality
    >
      {({ project }) => (
        <>
          {traveledCities.map((city) => {
            const pt = project(city.lon, city.lat);
            if (!pt) return null;
            const [x, y] = pt;
            if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

            // Color scheme based on status
            let fillColor = "#3B82F6"; // Default blue for visited
            let strokeColor = "#1D4ED8";
            let radius = 5;

            if (city.isCurrent) {
              fillColor = "#EF4444"; // Red for current
              strokeColor = "#DC2626";
              radius = 8;
            } else if (city.isUpcoming) {
              fillColor = "#10B981"; // Green for upcoming
              strokeColor = "#059669";
              radius = 6;
            }

            return (
              <g key={city.name}>
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={city.isCurrent ? 2 : 1}
                />
                <title>
                  {city.name}
                  {city.isCurrent
                    ? " (Current)"
                    : city.isUpcoming
                    ? " (Upcoming)"
                    : " (Visited)"}
                </title>
                <text
                  x={x + (city.isCurrent ? 10 : 6)}
                  y={y - (city.isCurrent ? 8 : 6)}
                  fontSize={city.isCurrent ? 14 : 12}
                  fill="#111"
                  fontWeight={city.isCurrent ? "bold" : "normal"}
                >
                  {city.name}
                </text>
              </g>
            );
          })}
        </>
      )}
    </CountrySVG>
  );
}
