import React, { createContext, useContext, ReactNode } from "react";
import { TravelData } from "@/app/types/Travel-data";
import { useTravelData } from "@/hooks/useTravelData";

interface TravelDataContextType {
  travelData: TravelData[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const TravelDataContext = createContext<TravelDataContextType | undefined>(
  undefined
);

interface TravelDataProviderProps {
  children: ReactNode;
  source?: "local" | "s3";
}

export function TravelDataProvider({
  children,
  source = "local",
}: TravelDataProviderProps) {
  const travelDataState = useTravelData({ source });

  return (
    <TravelDataContext.Provider value={travelDataState}>
      {children}
    </TravelDataContext.Provider>
  );
}

export function useTravelDataContext() {
  const context = useContext(TravelDataContext);
  if (context === undefined) {
    throw new Error(
      "useTravelDataContext must be used within a TravelDataProvider"
    );
  }
  return context;
}
