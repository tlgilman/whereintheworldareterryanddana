"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, User, LogOut, Image as ImageIcon, Shield } from "lucide-react";
import WeatherIndicator from "./WeatherIndicator";

export default function Navigation() {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <nav className={`${isHome ? 'fixed top-0 left-0 w-full z-50 bg-transparent text-white' : 'bg-white shadow-sm text-gray-800'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          {/* Left Side: Menu & Login */}
          <div className="flex items-center gap-4">
            {status === "loading" ? (
              <div className="h-8 w-8 animate-pulse bg-gray-200 rounded-full"></div>
            ) : status === "authenticated" ? (
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`p-2 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${isHome ? 'text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                >
                  {isMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>

                {isMenuOpen && (
                    <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      <div className="px-4 py-2 text-sm text-gray-500 border-b">
                        Signed in as<br />
                        <span className="font-medium text-gray-900 truncate block">{session.user?.email}</span>
                      </div>
                      
                      <Link
                        href="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <User className="mr-3 h-4 w-4" />
                        Profile
                      </Link>

                      <Link
                        href="/pictures"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <ImageIcon className="mr-3 h-4 w-4" />
                        Pictures
                      </Link>

                      {session.user?.role === 'admin' && (
                        <Link
                          href="/admin"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          role="menuitem"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Shield className="mr-3 h-4 w-4" />
                          Admin
                        </Link>
                      )}

                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          signOut();
                        }}
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                        role="menuitem"
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => signIn()}
                    className={`font-medium ${isHome ? 'text-white hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Sign in
              </button>
            )}

            {/* Logo next to menu */}
            <Link href="/" className="flex-shrink-0 flex items-center ml-2">
              <span className={`text-xl font-bold ${isHome ? 'text-white' : 'text-gray-800'}`}>Travel Tracker</span>
            </Link>

            {/* Weather Indicator (Home only) */}
            {isHome && <WeatherIndicator />}
          </div>
        </div>
      </div>
    </nav>
  );
}
