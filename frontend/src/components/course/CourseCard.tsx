"use client";

import { useState } from "react";
import Link from "next/link";
import { User, BookOpen, ArrowRight, Building2 } from "lucide-react";
import type { Course } from "@/gen/catalog/v1/catalog_pb";
import { getRpcClient } from "@/lib/connect_client";

import { useQueryClient } from "@tanstack/react-query";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";

export function CourseCard({ course }: { course: Course }) {
  const [imgError, setImgError] = useState(false);

  const queryClient = useQueryClient();

  const handlePrefetch = () => {
    queryClient.prefetchQuery({
      queryKey: ["courseDetail", course.id],
      queryFn: async () => {
        const client = getRpcClient(CatalogService);
        const res = await client.getCourseDetail({ idOrSlug: course.id });
        return res.course ?? null;
      },
    });
  };

  return (
    <div
      onMouseEnter={handlePrefetch}
      className="group relative hover:z-10 bg-surface-container-low text-on-surface border border-outline-variant hover:border-outline hover:bg-surface-container rounded-3xl p-6 transition-colors duration-m3-medium-2 ease-m3-emphasized shadow-xs hover:shadow-md flex flex-col justify-between"
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
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-on-primary-container bg-primary-container px-3 py-1 rounded-full border border-primary/20 shadow-xs">
                <Building2 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                {course.partnerName || "Coursera Partner"}
              </span>
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
    </div>
  );
}
