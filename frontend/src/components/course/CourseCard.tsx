"use client";

import { useState } from "react";
import Link from "next/link";
import { User, BookOpen, ArrowRight, Building2 } from "lucide-react";
import type { Course } from "@/gen/catalog/v1/catalog_pb";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Progress } from "@/components/ui/Progress";

export function CourseCard({ course, progress }: { course: Course; progress?: number }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Card
      variant="outlined"
      className="group relative hover:z-10 rounded-3xl p-6 flex flex-col justify-between"
    >
      <div>
        {/* Partner Header */}
        <div className="flex items-center justify-between gap-3 mb-4 h-7">
          <div className="flex items-center gap-3 min-w-0">
            {!imgError && course.partnerLogoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={course.partnerLogoUrl}
                alt={course.partnerName}
                onError={() => setImgError(true)}
                className="h-6 max-w-[140px] w-auto object-contain dark:brightness-200 dark:contrast-200 transition-opacity"
              />
            ) : null}

            {(imgError || !course.partnerLogoUrl) && (
              <Chip
                variant="assist"
                className="h-7 text-xs font-bold bg-primary-container text-on-primary-container border-primary/20 hover:bg-primary-container pointer-events-none cursor-default shadow-xs"
                leadingIcon={<Building2 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />}
              >
                {course.partnerName || "Coursera Partner"}
              </Chip>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <Link href={`/courses/${course.id}`} prefetch={true} className="block">
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
        <div className="pt-4 border-t border-outline-variant mb-6 flex items-center justify-between text-xs text-on-surface-variant font-medium">
          <span className="flex items-center gap-1.5 min-w-0 truncate max-w-[160px]">
            <User className="w-3.5 h-3.5 text-on-surface-variant shrink-0" aria-hidden="true" />
            {course.instructorNames.join(", ") || "Giảng viên Coursera"}
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-on-surface-variant" aria-hidden="true" />
            {course.weekModules.length} {"Tuần học"}
          </span>
        </div>

        {/* Action Link */}
        <Link
          href={`/courses/${course.id}`}
          prefetch={true}
          transitionTypes={["nav-forward"]}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-full bg-primary hover:bg-primary-hover text-on-primary text-sm font-bold transition-colors shadow-xs hover:shadow-md"
        >
          {"Xem Chi Tiết Khóa Học"}
          <ArrowRight
            className="w-4 h-4 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>
      </div>
    </Card>
  );
}
