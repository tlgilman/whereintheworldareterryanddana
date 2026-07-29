"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Photo } from "@/app/types/Photo";
import { useTravelData } from "@/hooks/useTravelData";
import {
  Camera,
  Plus,
  Search,
  MapPin,
  Globe,
  Filter,
  Loader2,
  Sparkles,
  Calendar,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import PhotoModal from "@/components/PhotoModal";
import PhotoUploadModal from "@/components/PhotoUploadModal";

export default function PictureBookPage() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const { travelData } = useTravelData({ source: "api" });

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("ALL");
  const [selectedCountry, setSelectedCountry] = useState<string>("ALL");

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/photos");
      if (res.ok) {
        const data: Photo[] = await res.json();
        setPhotos(data);
      }
    } catch (e) {
      console.error("Error fetching photos", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  // Compute unique locations and countries for filters
  const uniqueLocations = Array.from(
    new Set(photos.map((p) => p.location).filter(Boolean))
  );
  const uniqueCountries = Array.from(
    new Set(photos.map((p) => p.country).filter(Boolean))
  );

  // Filter photos
  const filteredPhotos = photos.filter((photo) => {
    const matchesLocation =
      selectedLocation === "ALL" ||
      photo.location.toLowerCase() === selectedLocation.toLowerCase();

    const matchesCountry =
      selectedCountry === "ALL" ||
      photo.country.toLowerCase() === selectedCountry.toLowerCase();

    const matchesSearch =
      !searchQuery.trim() ||
      photo.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      photo.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (photo.caption && photo.caption.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesLocation && matchesCountry && matchesSearch;
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />

      {/* Hero Header */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-blue-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Terry & Dana&apos;s Travel Picture Book</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Our World in Photos 📸
          </h1>

          <p className="max-w-2xl mx-auto text-slate-300 text-base sm:text-lg">
            Explore memories and moments captured from across our journeys around the globe.
          </p>

          {/* Quick Stats Bar */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-sm font-medium">
            <div className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl">
              <Camera className="w-5 h-5 text-blue-400" />
              <span>{photos.length} Total Photos</span>
            </div>

            <div className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl">
              <MapPin className="w-5 h-5 text-emerald-400" />
              <span>{uniqueLocations.length} Destinations</span>
            </div>

            <div className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl">
              <Globe className="w-5 h-5 text-purple-400" />
              <span>{uniqueCountries.length} Countries</span>
            </div>

            {isAuthenticated && (
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold"
              >
                <Plus className="w-5 h-5" />
                <span>Upload New Photo</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by destination or caption..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm text-gray-800 bg-gray-50/50"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1">
              <Filter className="w-4 h-4 text-blue-600" />
              <span>Filter:</span>
            </div>

            {/* Location Select */}
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Destinations ({uniqueLocations.length})</option>
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            {/* Country Select */}
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Countries ({uniqueCountries.length})</option>
              {uniqueCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Reset Filters */}
            {(selectedLocation !== "ALL" || selectedCountry !== "ALL" || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedLocation("ALL");
                  setSelectedCountry("ALL");
                  setSearchQuery("");
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Gallery Section */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-gray-500 font-medium text-sm">
              Loading picture book gallery...
            </p>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No Photos Found</h3>
            <p className="text-sm text-gray-500">
              {photos.length === 0
                ? "No photos have been uploaded to the picture book yet."
                : "No photos match your current search filters."}
            </p>

            {isAuthenticated && (
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Upload First Photo</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredPhotos.map((photo, index) => (
              <div
                key={photo.id || index}
                onClick={() => setSelectedPhotoIndex(index)}
                className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-200/80 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col"
              >
                {/* Photo Image */}
                <div className="relative aspect-4/3 overflow-hidden bg-gray-900">
                  <img
                    src={photo.url}
                    alt={photo.caption || photo.location}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80";
                    }}
                  />

                  {/* Location Badge Overlay */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-md text-white rounded-lg text-xs font-semibold flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-blue-400" />
                    <span>{photo.location}</span>
                  </div>

                  {/* Source Badge */}
                  <div className="absolute top-3 right-3 px-2 py-0.5 bg-white/80 backdrop-blur-md text-gray-800 rounded text-[10px] font-bold uppercase tracking-wider">
                    {photo.source === "google_photos" ? "Google Photos" : "Photo"}
                  </div>
                </div>

                {/* Info Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
                      {photo.location}
                    </h4>
                    {photo.country && (
                      <p className="text-xs text-gray-500 font-medium">
                        {photo.country}
                      </p>
                    )}
                  </div>

                  {photo.caption && (
                    <p className="text-xs text-gray-600 line-clamp-2 italic leading-snug">
                      &quot;{photo.caption}&quot;
                    </p>
                  )}

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span>{formatDate(photo.uploadedAt)}</span>
                    </span>
                    <span className="text-blue-600 font-medium group-hover:underline">
                      View Full →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox Modal */}
      {selectedPhotoIndex !== null && (
        <PhotoModal
          isOpen={selectedPhotoIndex !== null}
          onClose={() => setSelectedPhotoIndex(null)}
          photos={filteredPhotos}
          initialIndex={selectedPhotoIndex}
          onPhotoDeleted={() => {
            fetchPhotos();
            setSelectedPhotoIndex(null);
          }}
        />
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <PhotoUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          trips={travelData}
          onPhotoUploaded={() => fetchPhotos()}
        />
      )}
    </div>
  );
}
