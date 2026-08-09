import { Card } from "@/components/ui/Card";

export function CourseGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <Card key={n} variant="elevated" className="rounded-3xl p-6 animate-pulse">
          <div className="h-6 bg-muted rounded w-3/4 mb-4" />
          <div className="h-4 bg-muted rounded w-1/2 mb-6" />
          <div className="h-16 bg-muted rounded mb-6" />
          <div className="h-10 bg-muted rounded" />
        </Card>
      ))}
    </div>
  );
}
