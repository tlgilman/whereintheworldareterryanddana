"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { VisitorData } from "@/lib/google-sheets";

export default function VisitorsDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [visitors, setVisitors] = useState<VisitorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetch("/api/visitors")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setVisitors(data);
          }
          setLoading(false);
        })
        .catch(err => {
            console.error("Failed to fetch visitors", err);
            setLoading(false);
        });
    }
  }, [session]);

  if (status === "loading" || loading) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading visitor data...</p>
          </div>
        </div>
      );
  }

  if (session?.user?.role !== "admin") {
    return <div className="p-8 text-center text-red-600">Access Denied</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <button 
                onClick={() => router.push('/admin')}
                className="mr-4 text-gray-500 hover:text-gray-700"
            >
                ← Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Visitor Logs</h1>
          </div>
          <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
            Total Visits: <strong>{visitors.length}</strong>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Path
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referrer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                    </th>
                </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {visitors.map((visit, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(visit.timestamp || '').toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {visit.path}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {visit.ip}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate" title={visit.referrer}>
                        {visit.referrer || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {visit.city && visit.country ? `${visit.city}, ${visit.country}` : '-'}
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
