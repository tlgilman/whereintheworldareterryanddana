"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { VisitorData } from "@/lib/google-sheets";
import { Globe, Smartphone, Monitor, MapPin, ArrowLeft, Home, RefreshCw, Gamepad2 } from "lucide-react";

export default function VisitorsDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [visitors, setVisitors] = useState<VisitorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pathFilter, setPathFilter] = useState<"ALL" | "MAIN" | "GAMES">("ALL");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }
  }, [status, router]);

  const loadVisitors = () => {
    setRefreshing(true);
    fetch("/api/visitors")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setVisitors(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch visitors", err);
        setLoading(false);
      })
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    if (session?.user?.role === "admin") {
      loadVisitors();
    }
  }, [session]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading visitor analytics & location logs...</p>
        </div>
      </div>
    );
  }

  if (session?.user?.role !== "admin") {
    return <div className="p-8 text-center text-red-600 font-bold">Access Denied</div>;
  }

  // Calculate statistics
  const mobileCount = visitors.filter(
    (v) => (v.device || v.userAgent || "").toLowerCase().includes("mobile") ||
           (v.device || v.userAgent || "").toLowerCase().includes("iphone") ||
           (v.device || v.userAgent || "").toLowerCase().includes("android")
  ).length;

  const desktopCount = visitors.length - mobileCount;
  const mobilePercent = visitors.length > 0 ? Math.round((mobileCount / visitors.length) * 100) : 0;

  // Games page visits
  const gamesVisits = visitors.filter((v) => (v.path || "").startsWith("/games"));
  const gamesVisitsCount = gamesVisits.length;
  const uniqueGamesIps = new Set(gamesVisits.map((v) => v.ip)).size;

  // Top States / Locations
  const stateCounts: Record<string, number> = {};
  visitors.forEach((v) => {
    const loc = v.state ? `${v.state}${v.country ? `, ${v.country}` : ""}` : (v.country || "Unknown Location");
    stateCounts[loc] = (stateCounts[loc] || 0) + 1;
  });

  const sortedLocations = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]);

  // Filter visitors by path selection
  const filteredVisitors = visitors.filter((v) => {
    if (pathFilter === "GAMES") return (v.path || "").startsWith("/games");
    if (pathFilter === "MAIN") return !(v.path || "").startsWith("/games");
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Navigation Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push("/admin")}
              className="flex items-center space-x-1.5 text-xs text-slate-600 hover:text-slate-900 font-bold bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Admin</span>
            </button>
            <button
              onClick={() => router.push("/")}
              className="flex items-center space-x-1.5 text-xs bg-slate-900 hover:bg-black text-white font-bold px-3.5 py-2 rounded-xl shadow-sm transition-all"
            >
              <Home className="w-4 h-4" />
              <span>Return to Main Site</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={loadVisitors}
              disabled={refreshing}
              className="flex items-center space-x-2 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold px-3 py-2 rounded-xl transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh Logs</span>
            </button>
            <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-4 py-2 rounded-xl text-xs font-bold">
              Total Page Visits: <span className="text-base text-indigo-600 ml-1">{visitors.length}</span>
            </div>
          </div>
        </div>

        {/* Analytics Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Retro Games Visits</p>
              <h4 className="text-lg font-extrabold text-slate-900">
                {gamesVisitsCount} Visits
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {uniqueGamesIps} unique IP address{uniqueGamesIps !== 1 ? "es" : ""}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Visitor Region</p>
              <h4 className="text-lg font-extrabold text-slate-900">
                {sortedLocations.length > 0 ? sortedLocations[0][0] : "None"}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {sortedLocations.length > 0 ? `${sortedLocations[0][1]} visits` : "No visits recorded"}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mobile vs Desktop</p>
              <h4 className="text-lg font-extrabold text-slate-900">
                {mobilePercent}% Mobile / {100 - mobilePercent}% Desktop
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {mobileCount} mobile, {desktopCount} desktop
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unique Visitor Locations</p>
              <h4 className="text-lg font-extrabold text-slate-900">
                {sortedLocations.length} States / Regions
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">Across all visits</p>
            </div>
          </div>
        </div>

        {/* Detailed Visitor Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Detailed Visitor Log & Location Data</h3>
              <span className="text-xs text-slate-500 font-medium">Auto-resolves State, City, ISP, IP & Device</span>
            </div>

            {/* Path Filter Tabs */}
            <div className="flex items-center space-x-1.5 bg-slate-200/70 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setPathFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  pathFilter === "ALL"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Pages ({visitors.length})
              </button>
              <button
                onClick={() => setPathFilter("MAIN")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  pathFilter === "MAIN"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Main Site ({visitors.length - gamesVisitsCount})
              </button>
              <button
                onClick={() => setPathFilter("GAMES")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1 ${
                  pathFilter === "GAMES"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>Games ({gamesVisitsCount})</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Time</th>
                  <th className="px-6 py-3.5">Location & State</th>
                  <th className="px-6 py-3.5">Device & Browser</th>
                  <th className="px-6 py-3.5">Page Visited</th>
                  <th className="px-6 py-3.5">ISP / Network</th>
                  <th className="px-6 py-3.5">Client IP Address</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100 text-sm">
                {filteredVisitors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-sm">
                      {pathFilter === "GAMES"
                        ? "No game plays or visits recorded yet."
                        : "No visitor records found."}
                    </td>
                  </tr>
                ) : (
                  filteredVisitors.map((visit, index) => {
                    const locationText =
                      visit.city || visit.state || visit.country
                        ? [visit.city, visit.state, visit.country].filter(Boolean).join(", ")
                        : "Location Unknown";

                    const isMobile =
                      (visit.device || visit.userAgent || "").toLowerCase().includes("mobile") ||
                      (visit.device || visit.userAgent || "").toLowerCase().includes("iphone") ||
                      (visit.device || visit.userAgent || "").toLowerCase().includes("android");

                    const isGamePath = (visit.path || "").startsWith("/games");

                    return (
                      <tr key={index} className={`hover:bg-slate-50/80 transition-colors ${isGamePath ? "bg-purple-50/30" : ""}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-medium">
                          {visit.timestamp ? new Date(visit.timestamp).toLocaleString() : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
                            <span className="font-semibold text-slate-900 text-xs">
                              {locationText}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2 text-xs font-medium text-slate-800">
                            {isMobile ? (
                              <Smartphone className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Monitor className="w-4 h-4 text-blue-600" />
                            )}
                            <span>{visit.device || "Browser"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-md font-mono text-xs font-semibold ${
                            isGamePath ? "bg-purple-100 text-purple-800 border border-purple-200" : "bg-slate-100 text-slate-800"
                          }`}>
                            {visit.path || "/"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                          {visit.isp || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500">
                          {visit.ip}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
