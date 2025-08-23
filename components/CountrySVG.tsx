// CountrySVG.tsx
import React, { useMemo, useRef, useEffect } from "react";
import { zoom, zoomIdentity } from "d3-zoom";
import { select } from "d3-selection";
import {
  getCountryFeature,
  buildProjection,
  parseViewBox,
  type CountryName,
  toUSLower48,
} from "./geo-utils";

interface CountrySVGProps {
  country: CountryName;
  viewBox: string; // e.g. "0 0 1000 700"
  className?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  /** If true and country is United States, renders only the contiguous 48 states. */
  usLower48?: boolean;
  /** Render-prop to draw markers with the SAME projection. */
  children?: (args: {
    project: (lon: number, lat: number) => [number, number];
  }) => React.ReactNode;
  /** Enable zoom and pan functionality */
  enableZoom?: boolean;
}

export const CountrySVG: React.FC<CountrySVGProps> = ({
  country,
  viewBox,
  className = "",
  fill = "#E8F4FD",
  stroke = "#2563EB",
  strokeWidth = 1,
  opacity = 0.9,
  usLower48 = false,
  children,
  enableZoom = true,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);

  // Load country geometry
  const baseFeature = useMemo(() => getCountryFeature(country), [country]);
  // Optionally trim USA to Lower 48
  const feature = useMemo(() => {
    if (country === "United States" && usLower48 && baseFeature) {
      return toUSLower48(baseFeature);
    }
    return baseFeature;
  }, [country, usLower48, baseFeature]);

  const { width, height } = parseViewBox(viewBox);

  const { pathD, project } = useMemo(() => {
    if (!feature) {
      return {
        pathD: "",
        project: (_lon: number, _lat: number) => [0, 0] as [number, number],
      };
    }
    const { projection, path } = buildProjection(feature, width, height, 10);
    const d = path(feature) || "";
    const project = (lon: number, lat: number) =>
      projection([lon, lat]) as [number, number];
    return { pathD: d, project };
  }, [feature, width, height]);

  // Setup zoom behavior
  useEffect(() => {
    if (!enableZoom || !svgRef.current || !gRef.current) return;

    const svg = select(svgRef.current);
    const g = select(gRef.current);

    // Create zoom behavior
    const zoomBehavior = zoom()
      .scaleExtent([0.5, 10]) // Allow zoom from 50% to 1000%
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    // Apply zoom behavior to SVG
    svg.call(zoomBehavior as any);

    // Cleanup
    return () => {
      svg.on(".zoom", null);
    };
  }, [enableZoom, pathD]); // Re-run when pathD changes (new country)

  // Reset zoom function
  const resetZoom = () => {
    if (!svgRef.current || !gRef.current) return;
    const svg = select(svgRef.current);
    svg
      .transition()
      .duration(750)
      .call(zoom().transform as any, zoomIdentity);
  };

  // Zoom in function
  const zoomIn = () => {
    if (!svgRef.current) return;
    const svg = select(svgRef.current);
    svg
      .transition()
      .duration(300)
      .call(zoom().scaleBy as any, 1.5);
  };

  // Zoom out function
  const zoomOut = () => {
    if (!svgRef.current) return;
    const svg = select(svgRef.current);
    svg
      .transition()
      .duration(300)
      .call(zoom().scaleBy as any, 1 / 1.5);
  };

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className={`${className} ${
          enableZoom ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        role="img"
        aria-label={`Country outline for ${country}`}
      >
        <g ref={gRef}>
          {pathD ? (
            <g
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              opacity={opacity}
            >
              <path d={pathD} />
              {children ? children({ project }) : null}
            </g>
          ) : (
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={16}
              fill="#666"
            >
              {`Outline not found for "${country}"`}
            </text>
          )}
        </g>
      </svg>

      {/* Zoom Controls */}
      {enableZoom && pathD && (
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button
            onClick={zoomIn}
            className="w-10 h-10 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center"
            title="Zoom In"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </button>
          <button
            onClick={zoomOut}
            className="w-10 h-10 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center"
            title="Zoom Out"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 12H6"
              />
            </svg>
          </button>
          <button
            onClick={resetZoom}
            className="w-10 h-10 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center"
            title="Reset Zoom"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
