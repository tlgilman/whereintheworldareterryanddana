import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Map - Our Journey",
  description:
    "Explore our interactive travel map showing all the places we've visited around the world.",
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
