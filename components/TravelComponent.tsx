import React from "react";
import { useTravelData } from "@/hooks/useTravelData";
import { TravelData } from "@/app/types/Travel-data";

interface TravelComponentProps {
  source?: "local" | "s3";
  onDataLoad?: (data: TravelData[]) => void;
}

function TravelComponent({
  source = "local",
  onDataLoad,
}: TravelComponentProps) {
  const { travelData, loading, error } = useTravelData({ source });

  React.useEffect(() => {
    if (travelData.length > 0 && onDataLoad) {
      onDataLoad(travelData);
    }
  }, [travelData, onDataLoad]);

  if (loading)
    return <div className="text-center py-4">Loading travel data...</div>;
  if (error)
    return <div className="text-center py-4 text-red-500">Error: {error}</div>;

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">Travel Itinerary</h2>
      <div className="grid gap-2">
        {travelData.map((item, index) => (
          <div key={index} className="p-3 border rounded-lg">
            <div className="font-medium">
              {item.location}, {item.country}
            </div>
            <div className="text-sm text-gray-600">
              {item.timeZone} • {item.daysAtPlace} days
            </div>
            {item.coordinates && (
              <div className="text-xs text-gray-500">
                Lat: {item.coordinates.lat}, Lon: {item.coordinates.lon}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TravelComponent;
