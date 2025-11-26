"use client";

import React from "react";
import { motion } from "framer-motion";
import { Stats } from "@/app/types/Travel-data";

interface StatsDashboardProps {
  stats: Stats;
}

const StatCard = ({
  label,
  value,
  icon,
  delay,
  color,
}: {
  label: string;
  value: number;
  icon: string;
  delay: number;
  color: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-shadow"
  >
    <div className={`text-4xl mb-2 ${color}`}>{icon}</div>
    <div className="text-3xl font-bold text-gray-800 mb-1">
      {value}
    </div>
    <div className="text-sm text-gray-500 font-medium uppercase tracking-wider">
      {label}
    </div>
  </motion.div>
);

export default function StatsDashboard({ stats }: StatsDashboardProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-12">
      <StatCard
        label="Countries"
        value={stats.countries}
        icon="🌍"
        delay={0.1}
        color="text-blue-500"
      />
      <StatCard
        label="Destinations"
        value={stats.destinations}
        icon="📍"
        delay={0.2}
        color="text-red-500"
      />
      <StatCard
        label="Days Traveled"
        value={stats.totalDays}
        icon="📅"
        delay={0.3}
        color="text-green-500"
      />
      <StatCard
        label="Upcoming"
        value={stats.upcoming}
        icon="✈️"
        delay={0.4}
        color="text-purple-500"
      />
    </div>
  );
}
