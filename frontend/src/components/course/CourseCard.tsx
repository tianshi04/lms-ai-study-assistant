"use client";

import { useState, ViewTransition } from "react";
import Link from "next/link";
import Image from "next/image";
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
      className="group relative hover:z-10 bg-card text-card-foreground border border-border hover:border-primary/50 rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-primary/5 flex flex-col justify-between"
    >
      <div>
        {/* Partner Header */}
        <div className="flex items-center justify-between gap-3 mb-4 h-7">
          <div className="flex items-center gap-3 min-w-0">
            {!imgError && course.partnerLogoUrl ? (
              <Image
                src={course.partnerLogoUrl}
                alt={course.partnerName}
                width={140}
                height={24}
                unoptimized
                onError={() => setImgError(true)}
                className="h-6 max-w-[140px] w-auto object-contain dark:brightness-200 dark:contrast-200 transition-opacity"
              />
            ) : (
              <span className="text-xs font-bold font-mono text-info bg-info/10 px-2.5 py-1 rounded-md border border-info/20">
                {course.partnerName}
              </span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <Link href={`/courses/${course.id}`} prefetch={true} className="block">
          <ViewTransition name={`course-title-${course.id}`} share="text-morph">
            <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors mb-3 line-clamp-2">
              {course.title}
            </h3>
          </ViewTransition>
        </Link>
        <p className="text-sm text-muted-foreground mb-6 line-clamp-3 leading-relaxed">
          {course.description}
        </p>
      </div>

      <div>
        {/* Instructors & Modules Count */}
        <div className="pt-4 border-t border-border mb-6 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 truncate max-w-[160px]">
            <svg
              className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            {course.instructorNames.join(", ") || "Giảng viên Coursera"}
          </span>
          <span className="flex items-center gap-1.5">
            <svg
              className="w-3.5 h-3.5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            {course.weekModules.length} {"Tuần học"}
          </span>
        </div>

        {/* Action Link */}
        <Link
          href={`/courses/${course.id}`}
          transitionTypes={["nav-forward"]}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold transition-all shadow-lg"
        >
          {"Xem Chi Tiết Khóa Học"}
          <svg
            className="w-4 h-4 transition-transform group-hover:translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}
