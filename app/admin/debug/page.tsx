"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface SystemStatus {
  env: Record<string, boolean>;
  connectivity: {
    googleSheets: boolean;
    error: string | null;
  };
  timestamp: string;
}

export default function DebugPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetch("/api/debug")
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to fetch debug info");
          return res.json();
        })
        .then((data) => {
          setSystemStatus(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [session]);

  if (status === "loading" || loading) {
    return <div className="p-8">Loading system status...</div>;
  }

  if (session?.user?.role !== "admin") {
    return <div className="p-8">Access Denied</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Status</h1>
          <button
            onClick={() => router.push("/admin")}
            className="text-gray-600 hover:text-gray-900"
          >
            &larr; Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Environment Variables</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Check if required variables are set.</p>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              {systemStatus?.env && Object.entries(systemStatus.env).map(([key, present], index) => (
                <div key={key} className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6`}>
                  <dt className="text-sm font-medium text-gray-500">{key}</dt>
                  <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${present ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {present ? "Present" : "Missing"}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Connectivity</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">External service connection status.</p>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Google Sheets</dt>
                <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                  {systemStatus?.connectivity.googleSheets ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Connected
                    </span>
                  ) : (
                    <div className="flex flex-col">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 w-fit">
                        Failed
                      </span>
                      {systemStatus?.connectivity.error && (
                        <p className="mt-2 text-red-600 text-xs font-mono bg-red-50 p-2 rounded">
                          {systemStatus.connectivity.error}
                        </p>
                      )}
                    </div>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
