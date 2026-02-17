import { useState, useEffect } from "react";
import { TravelData } from "@/app/types/Travel-data";

interface UseTravelDataReturn {
  travelData: TravelData[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseTravelDataOptions {
  source?: "local" | "s3" | "api";
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
    let attempts = 0;
    const maxAttempts = 3;
    const baseDelay = 1000;

    while (attempts < maxAttempts) {
      try {
        setLoading(true);
        // Only clear error on first attempt to avoid flashing error states during retries
        if (attempts === 0) setError(null);

        const url =
          source === "s3"
            ? `https://my-travel-data-bucket.s3.us-east-1.amazonaws.com/travel-data.json?v=${Date.now()}`
            : source === "api"
              ? `/api/travel-data`
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
          // If 5xx error, throw to trigger retry. Client errors (4xx) might not be worth retrying except 429.
          if (response.status >= 500 || response.status === 429) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
          }
          throw new Error(`Failed to fetch travel data: ${response.statusText}`);
        }

        const data: TravelData[] = await response.json();

        // Validate data structure (basic validation)
        if (!Array.isArray(data)) {
          throw new Error("Invalid data format: expected array");
        }

        setTravelData(data);
        setError(null);
        setLoading(false);
        return; // Success, exit loop
      } catch (err) {
        attempts++;
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load travel data";

        console.error(`Attempt ${attempts} failed:`, err);

        if (attempts >= maxAttempts) {
          setError(errorMessage);
        } else {
          // Exponential backoff: 1000ms, 2000ms, 4000ms...
          const delay = baseDelay * Math.pow(2, attempts - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } finally {
        // Only set loading to false if this is the last attempt or success
        // But since we return on success, we need to handle failure case here OR before return.
        // Actually, cleaner to handle setLoading(false) only when completely done.
      }
    }
    setLoading(false);
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
