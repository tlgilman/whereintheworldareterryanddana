"use client";

import React from "react";
import { motion } from "framer-motion";
import { TravelData } from "@/app/types/Travel-data";

interface TimelineProps {
  trips: TravelData[];
  title: string;
  showAll: boolean;
  onToggle: () => void;
}

export default function Timeline({ trips, title, showAll, onToggle }: TimelineProps) {
  const displayTrips = showAll ? trips : trips.slice(0, 6);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      // Adjust for timezone offset to prevent off-by-one errors if date string is simple YYYY-MM-DD
      const userTimezoneOffset = date.getTimezoneOffset() * 60000;
      const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
      return adjustedDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getTravelIcon = (timeStr: string) => {
    if (!timeStr) return "";
    const lower = timeStr.toLowerCase();
    if (lower.includes("fly") || lower.includes("flight")) return "✈️";
    if (lower.includes("train") || lower.includes("rail")) return "🚆";
    return "🚗";
  };

  return (
    <div className="relative container mx-auto px-4 py-12 bg-white rounded-lg border mb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center">
          <span className="text-2xl mr-3">🗺️</span>
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <span className="ml-3 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
            {trips.length}
          </span>
        </div>

        {trips.length > 6 && (
          <button
            onClick={onToggle}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            {showAll ? "Show Less" : `Show All ${trips.length}`}
          </button>
        )}
      </div>

      {/* Vertical Line */}
      <div className="absolute left-4 md:left-1/2 top-32 bottom-12 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-orange-200" />

      <div className="space-y-12">
        {displayTrips.map((trip, index) => {
          const isEven = index % 2 === 0;
          const isVacation = !trip.residing;
          
          return (
            <motion.div
              key={`${trip.location}-${index}`}
              initial={{ opacity: 0, x: isEven ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              // Optimize delay: cap it at a small number so late items don't wait forever
              transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
              className={`relative flex items-center ${
                isEven ? "md:flex-row" : "md:flex-row-reverse"
              }`}
            >
              {/* Dot on the line */}
              <div 
                className={`absolute left-4 md:left-1/2 w-5 h-5 rounded-full transform -translate-x-1/2 z-10 border-4 ${
                  isVacation ? "bg-orange-500 border-orange-200" : "bg-blue-500 border-blue-200"
                }`} 
              />

              {/* Content Card */}
              <div className="ml-12 md:ml-0 md:w-1/2 px-4">
                <div
                  className={`relative rounded-xl shadow-sm p-6 border-l-4 transition-all hover:shadow-md ${
                    isVacation
                      ? "bg-orange-50 border-orange-400"
                      : "bg-white border-blue-400"
                  }`}
                >
                  {/* Vacation Badge */}
                  {isVacation && (
                    <div className="absolute top-4 right-4">
                      <span className="text-xs font-bold px-2 py-1 bg-orange-200 text-orange-800 rounded-full uppercase tracking-wide">
                        Vacation
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col mb-2">
                    <h3 className="text-xl font-bold text-gray-800 leading-tight">
                      {trip.location}
                    </h3>
                    <span className="text-sm font-medium text-gray-500 mt-1">
                      {trip.country}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-4 font-mono">
                    {formatDate(trip.arrivalDate)} — {formatDate(trip.departureDate)}
                  </div>

                  {/* Vacation Dates - Highlighted when present */}
                  {trip.vacationStart && trip.vacationEnd && (
                    <div className="mb-4">
                      <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                        <span>🏖️</span>
                        <span className="uppercase tracking-wider">VACATION</span>
                        <span className="font-mono font-normal opacity-90 border-l border-white/30 pl-2 ml-1">
                          {formatDate(trip.vacationStart)} - {formatDate(trip.vacationEnd)}
                        </span>
                      </div>
                    </div>
                  )}

                  {trip.daysAtPlace > 0 && (
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        <span>🕒</span>
                        <span className="font-medium">{trip.daysAtPlace} days</span>
                      </div>
                      {trip.travelTimeToHere && (
                        <div className="flex items-center gap-1">
                          <span>{getTravelIcon(trip.travelTimeToHere)}</span>
                          <span>{trip.travelTimeToHere.replace('*', '')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
