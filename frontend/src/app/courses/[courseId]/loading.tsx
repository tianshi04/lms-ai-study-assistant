import { Navbar } from "@/components/layout/Navbar";

export default function CourseDetailLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white transition-colors duration-200">
      <Navbar />

      {/* Hero Banner Skeleton */}
      <div className="bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800/80 py-12 animate-pulse">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex gap-2">
              <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded-full" />
              <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>
            <div className="h-10 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-20 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="flex gap-6 pt-4">
              <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            </div>
          </div>
          {/* Enrollment Card Skeleton */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
            <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-12 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <main className="max-w-7xl mx-auto px-6 py-12 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="h-36 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6" />
        <div className="h-36 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6" />
      </main>
    </div>
  );
}
