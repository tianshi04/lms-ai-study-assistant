import Link from "next/link";
import { User, BookOpen, ArrowRight } from "lucide-react";
import type { Course } from "@/gen/catalog/v1/catalog_pb";

import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { PartnerLogo } from "./PartnerLogo";

export function CourseCard({ course, progress }: { course: Course; progress?: number }) {
  return (
    <Card
      variant="outlined"
      className="group relative hover:z-10 rounded-3xl p-6 flex flex-col justify-between [content-visibility:auto] [contain-intrinsic-size:auto_320px]"
    >
      <div>
        {/* Partner Header */}
        <div className="flex items-center justify-between gap-3 mb-4 h-7">
          <div className="flex items-center gap-3 min-w-0">
            <PartnerLogo logoUrl={course.partnerLogoUrl} partnerName={course.partnerName} />
          </div>
        </div>

        {/* Title & Description */}
        <Link
          href={`/courses/${course.id}`}
          prefetch={true}
          className="block focus-visible:outline-none after:absolute after:inset-0 after:content-['']"
        >
          <h3 className="text-xl font-bold text-on-surface group-hover:text-primary transition-colors mb-3 min-w-0 line-clamp-2">
            {course.title}
          </h3>
        </Link>
        <p className="text-sm text-on-surface-variant mb-6 min-w-0 line-clamp-3 leading-relaxed">
          {course.description}
        </p>

        {progress !== undefined && progress !== null && (
          <div className="mb-4">
            <Progress.Linear value={progress} showLabel label="Tiến độ học tập" />
          </div>
        )}
      </div>

      <div>
        {/* Instructors & Modules Count */}
        <div className="pt-4 border-t border-outline-variant mb-5 flex items-center justify-between text-xs text-on-surface-variant font-medium">
          <span className="flex items-center gap-1.5 min-w-0 truncate max-w-[160px]">
            <User className="w-3.5 h-3.5 text-on-surface-variant shrink-0" aria-hidden="true" />
            {course.instructorNames.join(", ") || "Giảng viên Coursera"}
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-on-surface-variant" aria-hidden="true" />
            {course.weekModules.length} {"Tuần học"}
          </span>
        </div>

        {/* Visual Action Indicator (Card is clickably accessible via primary Link overlay) */}
        <div
          aria-hidden="true"
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-full bg-primary group-hover:bg-primary-hover text-on-primary text-sm font-bold transition-colors shadow-xs group-hover:shadow-md pointer-events-none"
        >
          {"Xem Chi Tiết Khóa Học"}
          <ArrowRight
            className="w-4 h-4 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </div>
      </div>
    </Card>
  );
}
