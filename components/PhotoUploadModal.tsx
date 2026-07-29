"use client";

import React, { useState, useEffect } from "react";
import { X, Upload, Link as LinkIcon, Image as ImageIcon, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { TravelData } from "@/app/types/Travel-data";
import { Photo } from "@/app/types/Photo";

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips?: TravelData[];
  defaultLocation?: string;
  defaultCountry?: string;
  onPhotoUploaded?: (newPhoto: Photo) => void;
}

export default function PhotoUploadModal({
  isOpen,
  onClose,
  trips = [],
  defaultLocation = "",
  defaultCountry = "",
  onPhotoUploaded,
}: PhotoUploadModalProps) {
  const [activeTab, setActiveTab] = useState<"file" | "url">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlPreview, setUrlPreview] = useState<string | null>(null);
  
  const [location, setLocation] = useState(defaultLocation);
  const [country, setCountry] = useState(defaultCountry);
  const [caption, setCaption] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Sync default location/country when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocation(defaultLocation);
      setCountry(defaultCountry);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, defaultLocation, defaultCountry]);

  // When location changes, auto-fill country if matching trip found
  const handleLocationChange = (loc: string) => {
    setLocation(loc);
    const match = trips.find((t) => t.location.toLowerCase() === loc.toLowerCase());
    if (match && match.country) {
      setCountry(match.country);
    }
  };

  // Handle File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setError(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle URL changes with live preview validation
  const handleUrlChange = (val: string) => {
    setUrlInput(val);
    setError(null);

    let cleanVal = val.trim();
    if (cleanVal) {
      if (cleanVal.includes("photos.google.com/photo/")) {
        setError(
          "That link (photos.google.com/photo/...) is a private browser address bar link. To share a photo, click the Share icon (↗️) -> Create link in Google Photos, or switch to the 'Upload File' tab to pick the file directly!"
        );
        setUrlPreview(null);
        return;
      }

      // Remove query parameters like ?authuser=0 that Google adds locally
      cleanVal = cleanVal.replace(/[?&]authuser=\d+/g, "");
      setUrlPreview(cleanVal);
    } else {
      setUrlPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim()) {
      setError("Please select or enter a location.");
      return;
    }

    if (activeTab === "file" && !selectedFile) {
      setError("Please select an image file to upload.");
      return;
    }

    if (activeTab === "url" && !urlInput.trim()) {
      setError("Please enter a Google Photos or image web URL.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let response: Response;

      if (activeTab === "file" && selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("location", location.trim());
        formData.append("country", country.trim());
        formData.append("caption", caption.trim());
        formData.append("source", "file_upload");

        response = await fetch("/api/photos/upload", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/photos/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: urlInput.trim(),
            location: location.trim(),
            country: country.trim(),
            caption: caption.trim(),
            source: urlInput.includes("photos.google") ? "google_photos" : "external_url",
          }),
        });
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to upload photo");
      }

      const newPhoto: Photo = await response.json();
      setSuccess(true);

      if (onPhotoUploaded) {
        onPhotoUploaded(newPhoto);
      }

      // Reset form after brief success message
      setTimeout(() => {
        setSelectedFile(null);
        setFilePreview(null);
        setUrlInput("");
        setUrlPreview(null);
        setCaption("");
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "An error occurred while saving the photo.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Extract unique locations from trips list
  const uniqueLocations = Array.from(
    new Set(trips.map((t) => t.location).filter(Boolean))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden my-8 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center space-x-2">
            <ImageIcon className="w-5 h-5" />
            <h3 className="text-lg font-bold">Add Destination Photo</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>Photo added successfully!</span>
            </div>
          )}

          {/* Mode Tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("file")}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md transition-all ${
                activeTab === "file"
                  ? "bg-white text-blue-600 shadow-sm font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload File</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("url")}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md transition-all ${
                activeTab === "url"
                  ? "bg-white text-blue-600 shadow-sm font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              <span>Google Photos Link</span>
            </button>
          </div>

          {/* Tab 1: File Upload */}
          {activeTab === "file" && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Choose Image File
              </label>
              <div className="relative border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50/50 transition-all cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                {filePreview ? (
                  <div className="relative w-full max-h-48 rounded-lg overflow-hidden flex items-center justify-center bg-gray-900">
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="max-h-48 object-contain"
                    />
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">
                      Click or drag photo here
                    </p>
                    <p className="text-xs text-gray-400">
                      PNG, JPG, WEBP or phone camera photos
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Google Photos Link */}
          {activeTab === "url" && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Google Photos or Web Image URL
              </label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://lh3.googleusercontent.com/... or shared link"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-800"
              />
              <p className="text-xs text-gray-500">
                Copy an image link or direct URL from photos.google.com and paste it above.
              </p>

              {urlPreview && (
                <div className="mt-2">
                  <span className="text-xs font-semibold text-gray-600 block mb-1">
                    Live Preview:
                  </span>
                  <div className="relative w-full max-h-44 rounded-lg overflow-hidden flex items-center justify-center bg-gray-900 border border-gray-200">
                    <img
                      src={urlPreview}
                      alt="Link preview"
                      className="max-h-44 object-contain"
                      referrerPolicy="no-referrer"
                      onError={() => {
                        setError("Could not load image from this link. Try copying the link via the Share button or uploading the photo file directly.");
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Location Picker */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Location *
              </label>
              {uniqueLocations.length > 0 ? (
                <div className="space-y-1">
                  <select
                    value={location}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-800 bg-white"
                  >
                    <option value="">-- Select Destination --</option>
                    {uniqueLocations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Or type custom location..."
                    className="w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-xs text-gray-800"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Paris, Tokyo"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-800"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. France, Japan"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-800"
              />
            </div>
          </div>

          {/* Caption */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Caption / Story (Optional)
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              placeholder="Add a fun memory or note about this picture..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-800"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Save Photo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
