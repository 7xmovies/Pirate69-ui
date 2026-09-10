import React from 'react';

export function MediaGridSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
      {Array.from({ length: 8 }).map((_, index) => (
        <div 
          key={index}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden animate-pulse"
        >
          {/* Thumbnail Skeleton */}
          <div className="w-full aspect-[2/3] bg-slate-100 dark:bg-slate-800" />
          
          {/* Content Skeleton */}
          <div className="p-3 sm:p-5 flex flex-col gap-3 sm:gap-4">
            <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded w-full" />
            <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
