"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function VisitorTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Use a ref to prevent double-firing in strict mode if necessary, 
  // though useEffect dependency change is what we want.
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    const trackPage = async () => {
      const fullPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
      
      // Avoid duplicate tracking for the same path (handling Strict Mode double-mount)
      if (lastTrackedPath.current === fullPath) return;
      lastTrackedPath.current = fullPath;

      try {
        await fetch("/api/track-visitor", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: fullPath,
            referrer: document.referrer,
          }),
        });
      } catch (error) {
        console.error("Failed to track visitor:", error);
      }
    };

    trackPage();
  }, [pathname, searchParams]);

  return null;
}
