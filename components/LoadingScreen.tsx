import React from 'react';
import Image from 'next/image';

/** A shimmering placeholder bar. */
const Bar = ({ className = '' }: { className?: string }) => (
  <div className={`skeleton rounded-md ${className}`} />
);

/**
 * Full-screen loading placeholder shown while AppProvider fetches the initial
 * state (and rides out any serverless/DB cold-start retries). It mirrors the
 * real app shell — sidebar + folder-card grid — so the layout doesn't jump
 * when the data arrives, and the shimmer signals work-in-progress.
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

      {/* Main content skeleton */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="space-y-2 mb-8">
          <Bar className="h-7 w-48" />
          <Bar className="h-4 w-72" />
        </div>

        {/* Search bar placeholder */}
        <Bar className="h-11 w-full max-w-md mb-6 rounded-lg" />

        {/* Folder / entity card grid placeholder */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col items-center gap-3"
            >
              <div className="skeleton w-12 h-12 rounded-xl" />
              <Bar className="h-4 w-20" />
              <Bar className="h-3 w-14" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
