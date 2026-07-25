export function CourseGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <div
          key={n}
          className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 animate-pulse shadow-sm"
        >
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-4" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-6" />
          <div className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded mb-6" />
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
      ))}
    </div>
  );
}
