// Core travel data interface for a single trip/destination
export interface TravelData {
  location: string; // City name (e.g., "Lisbon", "Barcelona")
  country: string; // Country name (e.g., "Portugal", "Spain")
  travelTimeToHere: string; // Travel duration (e.g., "8 hours", "2.5 hours")
  timeZone: string; // Timezone info (e.g., "GMT+1", "EST")
  arrivalDate: string; // ISO date string (e.g., "2025-08-10")
  departureDate: string; // ISO date string (e.g., "2025-08-25")
  daysAtPlace: number; // Number of days staying (calculated or manual)
  booked: boolean; // Whether the accommodation/transportation is booked
  residing: boolean; // Whether the person is residing in the location
  coordinates?: {
    // Optional for backward compatibility
    lat: number;
    lon: number;
  };
}

// Statistics interface for hero section and summary displays
export interface Stats {
  countries: number; // Total unique countries visited
  destinations: number; // Total number of destinations/cities
  totalDays: number; // Total days spent traveling
  upcoming: number; // Number of upcoming planned destinations
}

// Props interface for HeroSection component
export interface HeroSectionProps {
  currentLocation: TravelData | null;
  stats: Stats;
}

// Props interface for LocationCard component
export interface LocationCardProps {
  trip: TravelData;
  isCurrent?: boolean;
}

// Extended travel data with additional optional fields for future features
export interface ExtendedTravelData extends TravelData {
  photos?: string[]; // Array of photo URLs for this location
  highlights?: string[]; // Key highlights or activities
  accommodation?: {
    name: string;
    type: "hotel" | "airbnb" | "hostel" | "coliving" | "friends";
    rating?: number;
    cost?: number;
  };
  weather?: {
    averageTemp: number;
    season: "spring" | "summer" | "fall" | "winter";
    description: string;
  };
  workspaces?: {
    name: string;
    type: "coworking" | "cafe" | "library" | "home";
    wifiSpeed?: number;
    rating?: number;
  }[];
  meetups?: {
    date: string;
    attendees: string[];
    location: string;
    notes?: string;
  }[];
  budget?: {
    accommodation: number;
    food: number;
    activities: number;
    transport: number;
    total: number;
    currency: string;
  };
  visaRequired?: boolean;
  notes?: string;
  tags?: string[]; // e.g., ["beach", "mountains", "city", "workation"]
}

// Travel status enum for better type safety
export enum TravelStatus {
  PLANNED = "planned",
  CURRENT = "current",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

// Enhanced travel data with status
export interface TravelDataWithStatus extends TravelData {
  status: TravelStatus;
  id: string; // Unique identifier
  createdAt: string; // When this trip was planned
  updatedAt: string; // Last modification date
}

// API response interfaces for data fetching
export interface TravelDataResponse {
  data: TravelData[];
  total: number;
  currentLocation: TravelData | null;
  upcomingCount: number;
}

// Filter and sorting options for travel data
export interface TravelDataFilters {
  countries?: string[];
  minDays?: number;
  maxDays?: number;
  startDate?: string;
  endDate?: string;
  status?: TravelStatus[];
  tags?: string[];
}

export interface TravelDataSortOptions {
  field:
    | "arrivalDate"
    | "departureDate"
    | "daysAtPlace"
    | "location"
    | "country";
  direction: "asc" | "desc";
}

// Utility type for creating new travel entries
export type CreateTravelData = Omit<TravelData, "daysAtPlace"> & {
  daysAtPlace?: number; // Optional, can be calculated from dates
};

// Type guards for runtime type checking
export const isTravelData = (obj: unknown): obj is TravelData => {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  return (
    typeof candidate.location === "string" &&
    typeof candidate.country === "string" &&
    typeof candidate.travelTimeToHere === "string" &&
    typeof candidate.timeZone === "string" &&
    typeof candidate.arrivalDate === "string" &&
    typeof candidate.departureDate === "string" &&
    typeof candidate.daysAtPlace === "number" &&
    typeof candidate.booked === "boolean" && // Add validation for booked property
    typeof candidate.residing === "boolean"
  );
};

// Helper function to calculate days between dates
export const calculateDaysAtPlace = (
  arrivalDate: string,
  departureDate: string
): number => {
  const arrival = new Date(arrivalDate);
  const departure = new Date(departureDate);
  const diffTime = Math.abs(departure.getTime() - arrival.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Helper function to determine if a stay is considered "long"
export const isLongStay = (daysAtPlace: number): boolean => {
  return daysAtPlace >= 5;
};

// Helper function to get current location from travel data
export const getCurrentLocation = (
  travelData: TravelData[]
): TravelData | null => {
  const today = new Date();
  return (
    travelData.find((trip) => {
      const arrival = new Date(trip.arrivalDate);
      const departure = new Date(trip.departureDate);
      return today >= arrival && today <= departure;
    }) || null
  );
};

// Helper function to get upcoming locations
export const getUpcomingLocations = (
  travelData: TravelData[]
): TravelData[] => {
  const today = new Date();
  return travelData
    .filter((trip) => {
      const arrival = new Date(trip.arrivalDate);
      return arrival > today;
    })
    .sort(
      (a, b) =>
        new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime()
    );
};

// Helper function to get trips that have already been completed
export const getAlreadyTraveled = (travelData: TravelData[]): TravelData[] => {
  const today = new Date();
  return travelData
    .filter((trip) => {
      const departure = new Date(trip.departureDate);
      return departure < today;
    })
    .sort(
      (a, b) =>
        new Date(b.departureDate).getTime() -
        new Date(a.departureDate).getTime()
    ); // Most recent first
};

// Helper function to get upcoming booked trips
export const getUpcomingTrips = (travelData: TravelData[]): TravelData[] => {
  const today = new Date();
  return travelData
    .filter((trip) => {
      const arrival = new Date(trip.arrivalDate);
      return arrival > today && trip.booked === true;
    })
    .sort(
      (a, b) =>
        new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime()
    ); // Earliest first
};

// Helper function to get potential (unbooked) future trips
export const getPotentialTrips = (travelData: TravelData[]): TravelData[] => {
  const today = new Date();
  return travelData
    .filter((trip) => {
      const arrival = new Date(trip.arrivalDate);
      return arrival > today && trip.booked === false;
    })
    .sort(
      (a, b) =>
        new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime()
    ); // Earliest first
};

// Master function to organize all travel data into the 4 categories
export const organizeTravelData = (
  travelData: TravelData[]
): OrganizedTravelData => {
  return {
    alreadyTraveled: getAlreadyTraveled(travelData),
    currentLocation: getCurrentLocation(travelData),
    upcomingTrips: getUpcomingTrips(travelData),
    potentialTrips: getPotentialTrips(travelData),
  };
};

// Updated calculateStats to use the new categories
export const calculateStats = (travelData: TravelData[]): Stats => {
  const organized = organizeTravelData(travelData);

  // Filter to only include trips that have been completed or are currently happening
  const actuallyVisited = travelData.filter((trip) => {
    const today = new Date();
    const arrivalDate = new Date(trip.arrivalDate);
    const departureDate = new Date(trip.departureDate);

    // Include if:
    // 1. Trip is completed (departure is in the past)
    // 2. Currently visiting (today is between arrival and departure)
    return (
      departureDate < today || (arrivalDate <= today && today <= departureDate)
    );
  });

  // Count unique countries and destinations from actually visited places
  const countries = new Set(actuallyVisited.map((trip) => trip.country)).size;
  const destinations = actuallyVisited.length;

  // Calculate total days since first departure to today
  const totalDays = (() => {
    if (travelData.length === 0) return 0;

    // Find the earliest departure date
    const earliestDeparture = travelData
      .map((trip) => new Date(trip.departureDate))
      .filter((date) => !isNaN(date.getTime())) // Filter out invalid dates
      .sort((a, b) => a.getTime() - b.getTime())[0]; // Get earliest

    if (!earliestDeparture) return 0;

    // Calculate days from earliest departure to today
    const today = new Date();
    const diffTime = today.getTime() - earliestDeparture.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays); // Ensure non-negative
  })();

  const upcoming =
    organized.upcomingTrips.length + organized.potentialTrips.length;

  return {
    countries,
    destinations,
    totalDays,
    upcoming,
  };
};

// Interface for organized travel data by status
export interface OrganizedTravelData {
  alreadyTraveled: TravelData[];
  currentLocation: TravelData | null;
  upcomingTrips: TravelData[];
  potentialTrips: TravelData[];
}

export default TravelData;
