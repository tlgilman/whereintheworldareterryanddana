import React from "react";

interface SkeletonSectionProps {
  title?: string;
  count?: number;
}

const SkeletonSection: React.FC<SkeletonSectionProps> = ({ title, count = 3 }) => {
  return (
    <div className="bg-white rounded-lg border p-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center w-full">
          <div className="w-8 h-8 bg-gray-200 rounded-full mr-3"></div>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="ml-3 px-3 py-1 bg-gray-100 rounded-full w-8 h-6"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="bg-gray-100 rounded-xl p-4 h-48">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkeletonSection;
