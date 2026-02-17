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
import Timeline from "./Timeline";
import LocationCard from "./LocationCard";

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
  showAllJourney: boolean;
  onToggleJourney: () => void;
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
  showAllJourney,
  onToggleJourney,
}) => {
  // Track visitor on mount
  React.useEffect(() => {
    const trackVisitor = async () => {
      // Check session storage to avoid duplicate tracking per session
      if (sessionStorage.getItem('visitor_tracked')) return;

      try {
        await fetch('/api/track-visitor', { method: 'POST' });
        sessionStorage.setItem('visitor_tracked', 'true');
      } catch (e) {
        console.error('Failed to track visitor', e);
      }
    };

    trackVisitor();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <HeroSection currentLocation={currentLocation} stats={stats} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">

        {/* Link to Map Page */}
        <div className="text-center mb-16">
          <Link
            href="/map"
            className="group relative inline-flex items-center px-8 py-4 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all hover:shadow-lg hover:-translate-y-1"
          >
            <span className="text-lg font-semibold mr-2">🗺️ Explore the Interactive Map</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>

        {/* Current Location Section */}
        {currentLocation && (
          <div className="mb-20">
            <div className="flex items-center mb-8">
              <span className="text-2xl mr-3">📍</span>
              <h3 className="text-xl font-semibold text-gray-900">Current Location</h3>
            </div>
            <div className="max-w-2xl mx-auto">
              <LocationCard trip={currentLocation} isCurrent={true} />
            </div>
          </div>
        )}

        {/* Timeline View */}
        <Timeline
          title="Our Journey So Far"
          trips={alreadyTraveled}
          showAll={showAllJourney}
          onToggle={onToggleJourney}
        />

        {/* Upcoming & Potential (Keep as cards for now, or add to timeline?) */}
        <div className="grid md:grid-cols-2 gap-8">
          <TravelSection
            title="Upcoming Adventures"
            trips={upcomingTrips}
            showAll={showAllUpcoming}
            onToggle={onToggleUpcoming}
            emptyMessage="No booked trips yet."
            iconColor="text-purple-600"
            icon="✈️"
          />

          <TravelSection
            title="Dream Destinations"
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
