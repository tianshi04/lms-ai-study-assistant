"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { User, BookOpen, ArrowRight } from "lucide-react";
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
          <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors mb-3 line-clamp-2">
            {course.title}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground mb-6 line-clamp-3 leading-relaxed">
          {course.description}
        </p>
      </div>

      <div>
        {/* Instructors & Modules Count */}
        <div className="pt-4 border-t border-border mb-6 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 truncate max-w-[160px]">
            <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            {course.instructorNames.join(", ") || "Giảng viên Coursera"}
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
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
          <ArrowRight
            className="w-4 h-4 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>
      </div>
    </div>
  );
}
