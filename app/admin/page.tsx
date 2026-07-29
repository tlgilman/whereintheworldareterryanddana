"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TravelData } from "@/app/types/Travel-data";
import { Home, Users, Activity, Eye } from "lucide-react";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [trips, setTrips] = useState<TravelData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetch("/api/travel-data")
        .then((res) => res.json())
        .then((data) => {
          setTrips(data);
          setLoading(false);
        });
    }
  }, [session]);

  if (status === "loading" || loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (session?.user?.role !== "admin") {
    return <div className="p-8">Access Denied</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Navigation Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-gray-200">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Manage travel data, users, system status, and view site logs.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-black text-white font-bold px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
            >
              <Home className="w-4 h-4" />
              <span>Return to Main Site</span>
            </Link>

            <button
              onClick={() => router.push('/admin/users')}
              className="inline-flex items-center space-x-1.5 bg-blue-600 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors text-sm shadow-xs"
            >
              <Users className="w-4 h-4" />
              <span>User Directory</span>
            </button>

            <button
              onClick={() => router.push('/admin/visitors')}
              className="inline-flex items-center space-x-1.5 bg-purple-600 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-purple-700 transition-colors text-sm shadow-xs"
            >
              <Eye className="w-4 h-4" />
              <span>Visitor Logs</span>
            </button>

            <button
              onClick={() => router.push('/admin/debug')}
              className="inline-flex items-center space-x-1.5 bg-gray-600 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-700 transition-colors text-sm shadow-xs"
            >
              <Activity className="w-4 h-4" />
              <span>System Status</span>
            </button>
          </div>
        </div>

        {/* Trips Table Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Travel Destinations ({trips.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trips.map((trip, index) => (
                  <tr key={index} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900">
                        {trip.location}
                      </div>
                      <div className="text-xs text-gray-500">{trip.country}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {trip.arrivalDate} - {trip.departureDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                          trip.booked
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {trip.booked ? "Booked" : "Potential"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
