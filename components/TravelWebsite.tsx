"use client";

import React from "react";
// import {
//   Calendar,
//   MapPin,
//   Clock,
//   Globe,
//   Users,
//   ChevronRight,
// } from "lucide-react";
import Link from "next/link";
import { TravelData, Stats } from "@/app/types/Travel-data";
import HeroSection from "./HeroSection";
import TravelSection from "./TravelSection";

// Props interface for TravelWebsite component
interface TravelWebsiteProps {
  currentLocation: TravelData | null;
  stats: Stats;
  alreadyTraveled: TravelData[];
  upcomingTrips: TravelData[];
  potentialTrips: TravelData[];
  showAllAlreadyTraveled: boolean;
  showAllUpcoming: boolean;
  showAllPotential: boolean;
  onToggleAlreadyTraveled: () => void;
  onToggleUpcoming: () => void;
  onTogglePotential: () => void;
}

const TravelWebsite: React.FC<TravelWebsiteProps> = ({
  currentLocation,
  stats,
  alreadyTraveled,
  upcomingTrips,
  potentialTrips,
  showAllAlreadyTraveled,
  showAllUpcoming,
  showAllPotential,
  onToggleAlreadyTraveled,
  onToggleUpcoming,
  onTogglePotential,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <HeroSection currentLocation={currentLocation} stats={stats} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Link to Map Page */}
        <div className="text-center mb-12">
          <Link
            href="/map"
            className="inline-flex items-center px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-semibold"
          >
            🗺️ See Where We&apos;ve Been
          </Link>
        </div>

        {/* Travel Sections */}
        <div className="space-y-12">
          {/* Already Traveled Section */}
          <TravelSection
            title="Places We've Explored"
            trips={alreadyTraveled}
            showAll={showAllAlreadyTraveled}
            onToggle={onToggleAlreadyTraveled}
            emptyMessage="No completed trips yet."
            iconColor="text-green-600"
            icon="✓"
          />

          {/* Current Location Section */}
          {currentLocation && (
            <TravelSection
              title="Where We Are Now"
              trips={[currentLocation]}
              showAll={true}
              onToggle={() => {}}
              emptyMessage=""
              iconColor="text-blue-600"
              icon="📍"
            />
          )}

          {/* Upcoming Trips Section */}
          <TravelSection
            title="Upcoming Adventures (Booked)"
            trips={upcomingTrips}
            showAll={showAllUpcoming}
            onToggle={onToggleUpcoming}
            emptyMessage="No booked trips yet."
            iconColor="text-purple-600"
            icon="✈️"
          />

          {/* Potential Trips Section */}
          <TravelSection
            title="Dream Destinations (Wildly Speculative)"
            trips={potentialTrips}
            showAll={showAllPotential}
            onToggle={onTogglePotential}
            emptyMessage="No potential trips planned."
            iconColor="text-orange-600"
            icon="💭"
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12 mt-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">About Us</h3>
              <p className="text-gray-300">
                Digital nomads exploring the world, one destination at a time.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/map" className="text-gray-300 hover:text-white">
                    Interactive Map
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Follow Us</h3>
              <div className="flex space-x-4">
                <a
                  href="#"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Instagram
                </a>
                <a
                  href="#"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Blog
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <p className="text-gray-300">terry.and.dana@example.com</p>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center">
            <p className="text-gray-300">
              © 2024 Terry & Dana&apos;s Travel Adventures. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TravelWebsite;
