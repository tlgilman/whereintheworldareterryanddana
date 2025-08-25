import React, { useState, useEffect } from "react";
import Image from "next/image";
import { HeroSectionProps } from "@/app/types/Travel-data";

const HeroSection: React.FC<HeroSectionProps> = ({
  currentLocation,
  stats,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [localTime, setLocalTime] = useState("");

  // Your actual travel photos
  const heroImages = [
    {
      src: "/images/hero/hero-France.jpg",
      alt: "Sunflower field in France",
      location: "Paris, France",
    },
    {
      src: "/images/hero/hero-Japan.jpg",
      alt: "Osaka Lights",
      location: "Osaka, Japan",
    },
    {
      src: "/images/hero/hero-Scotland.jpg",
      alt: "Falkirk Wheel",
      location: "Scotland, UK",
    },
    {
      src: "/images/hero/hero-jazz-fest-2014.jpg",
      alt: "Jazzfest",
      location: "New Orleans, USA",
    },
    {
      src: "/images/hero/hero-Louisville.jpg",
      alt: "Barrel of Bourbon",
      location: "Louisville, USA",
    },
    {
      src: "/images/hero/hero-Colorado.jpg",
      alt: "Estes Park",
      location: "Colorado, USA",
    },
    {
      src: "/images/hero/hero-sedona.jpg",
      alt: "Sedona",
      location: "Sedona, USA",
    },
    {
      src: "/images/hero/hero-philadelphia.jpg",
      alt: "Philadelphia",
      location: "Philadelphia, USA",
    },
    {
      src: "/images/hero/hero-santa-fe.jpg",
      alt: "Santa Fe",
      location: "Santa Fe, USA",
    },
    {
      src: "/images/hero/hero-greenville.jpg",
      alt: "Greenville - Yummy",
      location: "Greenville, USA",
    },
  ];

  useEffect(() => {
    // Auto-rotate hero images every 5 seconds
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [heroImages.length]);

  useEffect(() => {
    // Update local time every minute
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

  const scrollToContent = () => {
    const element = document.getElementById("main-content");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative h-screen overflow-hidden flex items-center justify-center">
      {/* Background Images */}
      <div className="absolute inset-0">
        {heroImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-2000 ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              className="object-cover"
              style={{
                filter: "brightness(0.7)",
              }}
              priority={index === 0} // Prioritize loading the first image
              quality={85}
            />
          </div>
        ))}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-black/40" />

      {/* Optional: Photo Credit/Location Overlay */}
      <div className="absolute bottom-4 left-4 text-white/80 text-sm">
        📍 {heroImages[currentSlide].location}
      </div>

      {/* Location Info Card */}
      <div className="absolute top-8 right-8 bg-white/15 backdrop-blur-md rounded-3xl p-6 text-white border border-white/20 hidden md:block">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl font-bold">72°F</span>
          <span className="text-2xl">☀️</span>
        </div>
        <div className="text-sm opacity-80">{localTime}</div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-6">
        {/* Current Location Badge */}
        {currentLocation && (
          <div className="inline-flex items-center gap-3 bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-6 py-3 mb-8">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span>
              Currently in:{" "}
              <strong>
                {currentLocation.location}, {currentLocation.country}
              </strong>
            </span>
          </div>
        )}

        {/* Main Title */}
        <h1 className="text-4xl md:text-6xl lg:text-8xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600 bg-clip-text text-transparent">
          Terry & Dana
        </h1>

        <h2 className="text-xl md:text-2xl lg:text-3xl mb-4 font-light">
          Digital Nomads on the Move
        </h2>

        <p className="text-base md:text-lg lg:text-xl mb-12 opacity-90 max-w-2xl mx-auto">
          Following our wanderlust around the globe, one city at a time
        </p>

        {/* Stats */}
        <div className="flex justify-center gap-4 md:gap-8 mb-12">
          <div className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-4 md:p-6 min-w-[100px] md:min-w-[120px] border border-white/20">
            <div className="text-2xl md:text-3xl font-bold text-yellow-400">
              {stats.countries}
            </div>
            <div className="text-xs md:text-sm opacity-80 mt-1">Countries</div>
          </div>
          <div className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-4 md:p-6 min-w-[100px] md:min-w-[120px] border border-white/20">
            <div className="text-2xl md:text-3xl font-bold text-yellow-400">
              {stats.destinations}
            </div>
            <div className="text-xs md:text-sm opacity-80 mt-1">Cities</div>
          </div>
          <div className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-4 md:p-6 min-w-[100px] md:min-w-[120px] border border-white/20">
            <div className="text-2xl md:text-3xl font-bold text-yellow-400">
              {stats.totalDays}
            </div>
            <div className="text-xs md:text-sm opacity-80 mt-1">Days</div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <button
            onClick={scrollToContent}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            Follow Our Journey
          </button>
          <button className="bg-white/20 backdrop-blur-md text-white border-2 border-white/30 px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/30 transform hover:-translate-y-1 transition-all duration-300">
            Join Us Somewhere
          </button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div
        onClick={scrollToContent}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 cursor-pointer animate-bounce"
      >
        <div className="w-8 h-8 border-2 border-white rounded-full flex items-center justify-center bg-white/10 backdrop-blur-md">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
