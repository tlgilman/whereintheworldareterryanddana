"use client";

import React, { useState, useEffect } from "react";
import { X, Upload, Link as LinkIcon, Image as ImageIcon, FolderPlus, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
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

function compressImage(file: File, maxWidth = 1600, maxHeight = 1600, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(event.target?.result as string);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

export default function PhotoUploadModal({
  isOpen,
  onClose,
  trips = [],
  defaultLocation = "",
  defaultCountry = "",
  onPhotoUploaded,
}: PhotoUploadModalProps) {
  const [activeTab, setActiveTab] = useState<"file" | "url" | "album">("file");
  
  // Single file state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  
  // Single URL state
  const [urlInput, setUrlInput] = useState("");
  const [urlPreview, setUrlPreview] = useState<string | null>(null);

  // Album state
  const [albumUrlInput, setAlbumUrlInput] = useState("");
  const [albumPreview, setAlbumPreview] = useState<{
    title: string;
    count: number;
    photos: string[];
  } | null>(null);
  const [resolvingAlbum, setResolvingAlbum] = useState(false);
  
  const [location, setLocation] = useState(defaultLocation);
  const [country, setCountry] = useState(defaultCountry);
  const [caption, setCaption] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocation(defaultLocation);
      setCountry(defaultCountry);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, defaultLocation, defaultCountry]);

  const handleLocationChange = (loc: string) => {
    setLocation(loc);
    const match = trips.find((t) => t.location.toLowerCase() === loc.toLowerCase());
    if (match && match.country) {
      setCountry(match.country);
    }
  };

  const processSelectedFile = async (file: File) => {
    setSelectedFile(file);
    setError(null);

    try {
      const compressedDataUrl = await compressImage(file);
      setFilePreview(compressedDataUrl || URL.createObjectURL(file));
    } catch {
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        processSelectedFile(file);
      } else {
        setError("Please drop a valid image file (JPEG, PNG, WEBP).");
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleUrlChange = async (val: string) => {
    setUrlInput(val);
    setError(null);

    let cleanVal = val.trim();
    if (cleanVal) {
      if (cleanVal.includes("photos.google.com/photo/")) {
        setError(
          "That link (photos.google.com/photo/...) is a private browser link. To share a single photo, click Share (↗️) -> Create link in Google Photos!"
        );
        setUrlPreview(null);
        return;
      }

      cleanVal = cleanVal.replace(/[?&]authuser=\d+/g, "");

      if (cleanVal.includes("photos.app.goo.gl") || cleanVal.includes("photos.google.com/share") || cleanVal.includes("goo.gl/photos")) {
        try {
          const res = await fetch(`/api/photos/resolve-link?url=${encodeURIComponent(cleanVal)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.resolvedUrl) {
              setUrlPreview(data.resolvedUrl);
              return;
            }
          }
        } catch (e) {
          console.error("Link resolution error:", e);
        }
      }

      setUrlPreview(cleanVal);
    } else {
      setUrlPreview(null);
    }
  };

  const handleAlbumUrlChange = async (val: string) => {
    setAlbumUrlInput(val);
    setError(null);
    setAlbumPreview(null);

    const cleanVal = val.trim();
    if (cleanVal) {
      setResolvingAlbum(true);
      try {
        const res = await fetch(`/api/photos/resolve-album?url=${encodeURIComponent(cleanVal)}`);
        if (res.ok) {
          const data = await res.json();
          setAlbumPreview(data);
        } else {
          const errData = await res.json().catch(() => ({}));
          setError(errData.error || "Could not resolve album. Make sure the album link is shared to anyone with the link.");
        }
      } catch (e) {
        console.error("Album resolution error:", e);
        setError("Error connecting to album link.");
      } finally {
        setResolvingAlbum(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim()) {
      setError("Please select or enter a location.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (activeTab === "album") {
        if (!albumUrlInput.trim()) {
          setError("Please paste a Google Photos shared album link.");
          setIsSubmitting(false);
          return;
        }

        const res = await fetch("/api/albums", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            albumUrl: albumUrlInput.trim(),
            location: location.trim(),
            country: country.trim(),
            title: albumPreview?.title || `${location} Album`,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to save album");
        }

        setSuccess(true);
      } else if (activeTab === "file") {
        if (!selectedFile && !filePreview) {
          setError("Please select an image file to upload.");
          setIsSubmitting(false);
          return;
        }

        let response: Response;
        if (filePreview && filePreview.startsWith("data:image/")) {
          response = await fetch("/api/photos/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: filePreview,
              location: location.trim(),
              country: country.trim(),
              caption: caption.trim(),
              source: "file_upload",
            }),
          });
        } else if (selectedFile) {
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
          throw new Error("No file selected.");
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
      } else {
        if (!urlInput.trim()) {
          setError("Please enter a Google Photos or image web URL.");
          setIsSubmitting(false);
          return;
        }

        const response = await fetch("/api/photos/upload", {
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

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to upload photo");
        }

        const newPhoto: Photo = await response.json();
        setSuccess(true);

        if (onPhotoUploaded) {
          onPhotoUploaded(newPhoto);
        }
      }

      setTimeout(() => {
        setSelectedFile(null);
        setFilePreview(null);
        setUrlInput("");
        setUrlPreview(null);
        setAlbumUrlInput("");
        setAlbumPreview(null);
        setCaption("");
        setSuccess(false);
        onClose();
      }, 1000);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "An error occurred while saving.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

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
            <h3 className="text-lg font-bold">Add Destination Photos & Albums</h3>
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
              <span>Saved successfully! Auto-sync active.</span>
            </div>
          )}

          {/* Mode Tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("album")}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-md transition-all ${
                activeTab === "album"
                  ? "bg-white text-indigo-600 shadow-sm font-bold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <FolderPlus className="w-3.5 h-3.5 text-indigo-600" />
              <span>Shared Album (Multi-Photo)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("file")}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-md transition-all ${
                activeTab === "file"
                  ? "bg-white text-blue-600 shadow-sm font-bold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload File</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("url")}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-md transition-all ${
                activeTab === "url"
                  ? "bg-white text-blue-600 shadow-sm font-bold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Single Photo Link</span>
            </button>
          </div>

          {/* Tab 1: Google Photos Shared Album */}
          {activeTab === "album" && (
            <div className="space-y-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
              <div>
                <label className="block text-xs font-bold text-indigo-950 uppercase tracking-wider mb-1">
                  Google Photos Shared Album Link *
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={albumUrlInput}
                    onChange={(e) => handleAlbumUrlChange(e.target.value)}
                    placeholder="https://photos.app.goo.gl/... or share album link"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 pr-10"
                  />
                  {resolvingAlbum && (
                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                <p className="text-xs text-indigo-700 mt-1">
                  💡 <strong>Auto-Sync Feature:</strong> In Google Photos, select your photos &rarr; click <strong>Share (↗️) &rarr; Create Link</strong>. Paste that album link above! Any new photos you add to the Google Photos album in the future will automatically appear on your website.
                </p>
              </div>

              {/* Album Live Extraction Preview */}
              {albumPreview && (
                <div className="space-y-2 pt-2 border-t border-indigo-200">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                    <span>{albumPreview.title}</span>
                    <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[11px]">
                      {albumPreview.count} Photos Extracted
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 bg-white rounded-lg border border-indigo-100">
                    {albumPreview.photos.slice(0, 8).map((photoUrl, idx) => (
                      <div key={idx} className="relative aspect-square rounded-md overflow-hidden bg-gray-900">
                        <img
                          src={photoUrl}
                          alt={`Extracted ${idx}`}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: File Upload */}
          {activeTab === "file" && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Choose Image File or Drag from Phone Link
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isDragging
                    ? "border-blue-600 bg-blue-50/80 scale-[1.01]"
                    : "border-gray-300 hover:border-blue-500 bg-gray-50/50"
                }`}
              >
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
                      Click, drag file, or drop from Phone Link
                    </p>
                    <p className="text-xs text-gray-400">
                      PNG, JPG, WEBP or phone camera photos
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Single Google Photo Link */}
          {activeTab === "url" && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Single Google Photo Link
              </label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://photos.app.goo.gl/... or share link"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-800"
              />

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

          {/* Caption (for single photo or file) */}
          {activeTab !== "album" && (
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
          )}

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
                  <span>{activeTab === "album" ? "Save & Sync Album" : "Save Photo"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
