"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export default function PicturesPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/api/auth/signin");
    },
  });

  if (status === "loading") {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Travel Pictures</h1>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-600">
            Welcome, {session?.user?.name}! This section is restricted to logged-in users only.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Placeholder for future image gallery */}
            <div className="aspect-w-16 aspect-h-9 bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">Image Placeholder 1</span>
            </div>
            <div className="aspect-w-16 aspect-h-9 bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">Image Placeholder 2</span>
            </div>
            <div className="aspect-w-16 aspect-h-9 bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">Image Placeholder 3</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
