import React, { useState, useEffect } from "react";
import Image from "next/image";
import { HeroSectionProps } from "@/app/types/Travel-data";

const HeroSection: React.FC<HeroSectionProps> = ({
  currentLocation,
  stats,
  loading = false,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);


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



  const scrollToContent = () => {
    const element = document.getElementById("main-content");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center overflow-x-hidden">
      {/* Background Images */}
      <div className="absolute inset-0 fixed">
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
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-black/40 pointer-events-none" />

      {/* Optional: Photo Credit/Location Overlay */}
      <div className="absolute bottom-4 left-4 text-white/80 text-sm z-20">
        📍 {heroImages[currentSlide].location}
      </div>



      {/* Main Content */}
      <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-6 py-24 md:py-0">
        {/* Current Location Badge */}
        {currentLocation && (
          <div className="inline-flex items-center gap-3 bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 md:px-6 md:py-3 mb-8 text-sm md:text-base">
            <div className="w-2 h-2 md:w-3 md:h-3 bg-red-500 rounded-full animate-pulse" />
            <span>
              Currently in:{" "}
              <strong>
                {currentLocation.location}, {currentLocation.country}
              </strong>
            </span>
          </div>
        )}

        {/* Main Title */}
        <h1 className="text-4xl md:text-6xl lg:text-8xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600 bg-clip-text text-transparent leading-tight pb-2">
          Terry & Dana
        </h1>

        <h2 className="text-lg md:text-2xl lg:text-3xl mb-4 font-light">
          Digital Nomads on the Move
        </h2>

        <p className="text-sm md:text-lg lg:text-xl mb-12 opacity-90 max-w-2xl mx-auto leading-relaxed">
          Following our wanderlust around the globe, one city at a time
        </p>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-12">
          <div className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-4 md:p-6 min-w-[100px] md:min-w-[120px] border border-white/20 flex-1 sm:flex-none">
            {loading ? (
              <div className="h-8 md:h-9 bg-white/20 animate-pulse rounded mb-1 mx-auto w-16"></div>
            ) : (
                <div className="text-2xl md:text-3xl font-bold text-yellow-400">
                  {stats.countries}
                </div>
            )}
            <div className="text-xs md:text-sm opacity-80 mt-1">Countries</div>
          </div>
          <div className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-4 md:p-6 min-w-[100px] md:min-w-[120px] border border-white/20 flex-1 sm:flex-none">
            {loading ? (
              <div className="h-8 md:h-9 bg-white/20 animate-pulse rounded mb-1 mx-auto w-16"></div>
            ) : (
                <div className="text-2xl md:text-3xl font-bold text-yellow-400">
                  {stats.destinations}
                </div>
            )}
            <div className="text-xs md:text-sm opacity-80 mt-1">Cities</div>
          </div>
          <div className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-4 md:p-6 min-w-[100px] md:min-w-[120px] border border-white/20 flex-1 sm:flex-none">
            {loading ? (
              <div className="h-8 md:h-9 bg-white/20 animate-pulse rounded mb-1 mx-auto w-16"></div>
            ) : (
                <div className="text-2xl md:text-3xl font-bold text-yellow-400">
                  {stats.totalDays}
                </div>
            )}
            <div className="text-xs md:text-sm opacity-80 mt-1">Days</div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center w-full sm:w-auto px-4 sm:px-0">
          <button
            onClick={scrollToContent}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            Follow Our Journey
          </button>
          <button className="w-full sm:w-auto bg-white/20 backdrop-blur-md text-white border-2 border-white/30 px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/30 transform hover:-translate-y-1 transition-all duration-300">
            Join Us Somewhere
          </button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div
        onClick={scrollToContent}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 cursor-pointer animate-bounce hidden md:block"
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
