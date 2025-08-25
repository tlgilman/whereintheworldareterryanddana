import { useState, useEffect } from "react";
import { TravelData } from "@/app/types/Travel-data";

interface UseTravelDataReturn {
  travelData: TravelData[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseTravelDataOptions {
  source?: "local" | "s3";
  autoFetch?: boolean;
}

export function useTravelData(
  options: UseTravelDataOptions = {}
): UseTravelDataReturn {
  const { source = "local", autoFetch = true } = options;

  const [travelData, setTravelData] = useState<TravelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTravelData = async () => {
    try {
      setLoading(true);
      setError(null);

      const url =
        source === "s3"
          ? `https://my-travel-data-bucket.s3.us-east-1.amazonaws.com/travel-data.json?v=${Date.now()}`
          : `/travel-data.json?v=${Date.now()}`;

      const response = await fetch(url, {
        cache: "no-cache",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch travel data: ${response.statusText}`);
      }

      const data: TravelData[] = await response.json();

      // Validate data structure (basic validation)
      if (!Array.isArray(data)) {
        throw new Error("Invalid data format: expected array");
      }

      setTravelData(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load travel data";
      setError(errorMessage);
      console.error("Error loading travel data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchTravelData();
    }
  }, [source, autoFetch]);

  return {
    travelData,
    loading,
    error,
    refetch: fetchTravelData,
  };
}
