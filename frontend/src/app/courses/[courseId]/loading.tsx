export default function CourseDetailLoading() {
  return (
    <div className="w-full">
      {/* Hero Banner Skeleton */}
      <div className="bg-background border-b border-border py-12 animate-pulse">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex gap-2">
              <div className="h-6 w-32 bg-muted rounded-full" />
              <div className="h-6 w-24 bg-muted rounded-full" />
            </div>
            <div className="h-10 w-3/4 bg-muted rounded-xl" />
            <div className="h-20 w-full bg-muted rounded-xl" />
            <div className="flex gap-6 pt-4">
              <div className="h-10 w-32 bg-muted rounded-lg" />
              <div className="h-10 w-32 bg-muted rounded-lg" />
            </div>
          </div>
          {/* Enrollment Card Skeleton */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-xl space-y-6">
            <div className="h-6 w-24 bg-muted rounded" />
            <div className="h-8 w-40 bg-muted rounded" />
            <div className="h-12 w-full bg-muted rounded-xl" />
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="h-4 w-3/4 bg-muted rounded" />
              <div className="h-4 w-2/3 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <main className="max-w-7xl mx-auto px-6 py-12 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-lg" />
        <div className="h-36 w-full bg-card border border-border rounded-2xl p-6" />
        <div className="h-36 w-full bg-card border border-border rounded-2xl p-6" />
      </main>
    </div>
  );
}
