import React from 'react';
import Image from 'next/image';

/** A shimmering placeholder bar. */
const Bar = ({ className = '' }: { className?: string }) => (
  <div className={`skeleton rounded-md ${className}`} />
);

/**
 * Full-screen loading placeholder shown while AppProvider fetches the initial
 * state (and rides out any serverless/DB cold-start retries). It mirrors the
 * real manager shell — sidebar + Dashboard (stat cards + status panel) — so the
 * layout doesn't jump when the data arrives, and the shimmer signals progress.
 */
export const LoadingScreen: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar skeleton — desktop only, matches the real w-64 sidebar */}
      <div className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col shrink-0">
        <div className="p-6 border-b border-gray-200">
          <Image
            src="/assets/logo.webp"
            alt="Wibox"
            width={180}
            height={60}
            className="object-contain opacity-90"
            priority
          />
          <div className="flex items-center gap-3 mt-4">
            <div className="skeleton w-9 h-9 rounded-full" />
            <Bar className="h-5 w-20" />
          </div>
        </div>

        <div className="flex-1 p-4 space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Bar key={i} className="h-11 w-full" />
          ))}
        </div>

        <div className="p-4 border-t border-gray-200 space-y-2">
          <Bar className="h-9 w-full" />
          <Bar className="h-9 w-full" />
        </div>
      </div>

      {/* Main content skeleton — mirrors DashboardView */}
      <main className="flex-1 overflow-y-auto p-4 pt-16 md:p-8">
        <div className="space-y-6">
          {/* Title + subtitle */}
          <div className="space-y-2">
            <Bar className="h-7 w-56" />
            <Bar className="h-4 w-72" />
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4"
              >
                <div className="skeleton w-14 h-14 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Bar className="h-4 w-24" />
                  <Bar className="h-6 w-12" />
                </div>
              </div>
            ))}
          </div>

          {/* System status panel */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <Bar className="h-5 w-40 mb-4" />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex justify-between items-center py-3 ${i < 2 ? 'border-b border-gray-100' : ''}`}
                >
                  <Bar className="h-4 w-44" />
                  <Bar className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
