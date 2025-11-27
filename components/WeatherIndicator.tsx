"use client";

import React, { useState, useEffect } from "react";

export default function WeatherIndicator() {
  const [localTime, setLocalTime] = useState("");

  useEffect(() => {
    const updateLocalTime = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      setLocalTime(`${timeString} Local Time`);
    };

    updateLocalTime();
    const timeInterval = setInterval(updateLocalTime, 60000);
    return () => clearInterval(timeInterval);
  }, []);

  return (
    <div className="flex items-center gap-4 text-white ml-6 hidden md:flex">
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold">72°F</span>
        <span className="text-xl">☀️</span>
      </div>
      <div className="text-sm opacity-80 border-l border-white/30 pl-4 h-8 flex items-center">
        {localTime}
      </div>
    </div>
  );
}
