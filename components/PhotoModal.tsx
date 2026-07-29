"use client";

import React, { useState, useEffect } from "react";
import { Photo } from "@/app/types/Photo";
import { X, ChevronLeft, ChevronRight, Trash2, Calendar, MapPin, ExternalLink } from "lucide-react";
import { useSession } from "next-auth/react";

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: Photo[];
  initialIndex?: number;
  locationName?: string;
  onPhotoDeleted?: (photoId: string) => void;
}

export default function PhotoModal({
  isOpen,
  onClose,
  photos,
  initialIndex = 0,
  locationName,
  onPhotoDeleted,
}: PhotoModalProps) {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
      }
      if (e.key === "ArrowRight") {
        setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, photos.length, onClose]);

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex] || photos[0];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/photos?id=${currentPhoto.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete photo");
      }

      if (onPhotoDeleted) {
        onPhotoDeleted(currentPhoto.id);
      }

      if (photos.length <= 1) {
        onClose();
      } else {
        setCurrentIndex((prev) => (prev >= photos.length - 1 ? prev - 1 : prev));
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting photo. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 transition-opacity duration-300">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 text-white/80 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all"
        aria-label="Close modal"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Main Container */}
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden bg-gray-900 shadow-2xl border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                {currentPhoto.location || locationName || "Travel Photo"}
              </h2>
              {currentPhoto.country && (
                <p className="text-xs text-gray-400">{currentPhoto.country}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-xs font-semibold px-3 py-1 bg-gray-800 text-gray-300 rounded-full">
              {currentIndex + 1} of {photos.length}
            </span>
            {isAuthenticated && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                title="Delete Photo"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Display Area */}
        <div className="relative flex-1 flex items-center justify-center min-h-[350px] max-h-[65vh] bg-black/60 overflow-hidden">
          {/* Main Photo */}
          <img
            src={currentPhoto.url}
            alt={currentPhoto.caption || currentPhoto.location}
            className="max-h-[60vh] max-w-full object-contain select-none transition-all duration-300"
            onError={(e) => {
              // Fallback image handling
              (e.target as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80";
            }}
          />

          {/* Previous Arrow */}
          {photos.length > 1 && (
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/90 text-white rounded-full transition-all border border-white/10"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next Arrow */}
          {photos.length > 1 && (
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/90 text-white rounded-full transition-all border border-white/10"
              aria-label="Next photo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Caption & Metadata Footer */}
        <div className="p-4 bg-gray-950/90 border-t border-gray-800 space-y-3">
          {currentPhoto.caption && (
            <p className="text-sm text-gray-200 font-medium leading-relaxed">
              &quot;{currentPhoto.caption}&quot;
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between text-xs text-gray-400 gap-2 border-t border-gray-800/80 pt-2">
            <div className="flex items-center space-x-4">
              {currentPhoto.uploadedAt && (
                <span className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  <span>{formatDate(currentPhoto.uploadedAt)}</span>
                </span>
              )}
              {currentPhoto.uploadedBy && (
                <span className="text-gray-500">
                  Added by: <span className="text-gray-300">{currentPhoto.uploadedBy}</span>
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-400 uppercase text-[10px] font-bold tracking-wider">
                {currentPhoto.source === "google_photos"
                  ? "Google Photos"
                  : currentPhoto.source === "external_url"
                  ? "Web Link"
                  : "Uploaded File"}
              </span>
              <a
                href={currentPhoto.url}
                target="_blank"
                rel="noreferrer"
                className="p-1 hover:text-white transition-colors"
                title="Open original photo"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Thumbnail Strip */}
          {photos.length > 1 && (
            <div className="flex items-center space-x-2 overflow-x-auto pt-2 pb-1 scrollbar-thin">
              {photos.map((p, idx) => (
                <button
                  key={p.id || idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                    idx === currentIndex
                      ? "border-blue-500 scale-105 opacity-100 shadow-md"
                      : "border-transparent opacity-50 hover:opacity-80"
                  }`}
                >
                  <img
                    src={p.url}
                    alt={p.caption || "Thumbnail"}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
