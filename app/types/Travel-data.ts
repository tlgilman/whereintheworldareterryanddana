// Core travel data interface for a single trip/destination
export interface TravelData {
  location: string; // City name (e.g., "Lisbon", "Barcelona")
  country: string; // Country name (e.g., "Portugal", "Spain")
  travelTimeToHere: string; // Travel duration (e.g., "8 hours", "2.5 hours")
  timeZone: string; // Timezone info (e.g., "GMT+1", "EST")
  arrivalDate: string; // ISO date string (e.g., "2025-08-10")
  departureDate: string; // ISO date string (e.g., "2025-08-25")
  daysAtPlace: number; // Number of days staying (calculated or manual)
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
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as any).location === "string" &&
    typeof (obj as any).country === "string" &&
    typeof (obj as any).travelTimeToHere === "string" &&
    typeof (obj as any).timeZone === "string" &&
    typeof (obj as any).arrivalDate === "string" &&
    typeof (obj as any).departureDate === "string" &&
    typeof (obj as any).daysAtPlace === "number"
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

// Helper function to calculate travel statistics
export const calculateStats = (travelData: TravelData[]): Stats => {
  const countries = new Set(travelData.map((trip) => trip.country)).size;
  const destinations = travelData.length;
  const totalDays = travelData.reduce((sum, trip) => sum + trip.daysAtPlace, 0);
  const upcoming = getUpcomingLocations(travelData).length;

  return {
    countries,
    destinations,
    totalDays,
    upcoming,
  };
};

export default TravelData;
