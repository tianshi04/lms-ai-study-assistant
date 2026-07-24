"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Course } from "@/gen/catalog/v1/catalog_pb";
import { useTranslation } from "@/lib/i18n/TranslationProvider";

export function CourseCard({ course }: { course: Course }) {
  const [imgError, setImgError] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 flex flex-col justify-between">
      <div>
        {/* Partner Header */}
        <div className="flex items-center gap-3 mb-4 h-7">
          {!imgError && course.partnerLogoUrl ? (
            <Image
              src={course.partnerLogoUrl}
              alt={course.partnerName}
              width={140}
              height={24}
              unoptimized
              onError={() => setImgError(true)}
              className="h-6 max-w-[140px] w-auto object-contain dark:brightness-200 dark:contrast-200 transition-all"
            />
          ) : (
            <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-500/20">
              {course.partnerName}
            </span>
          )}
        </div>

        {/* Title & Description */}
        <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-3 line-clamp-2">
          {course.title}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 line-clamp-3 leading-relaxed">
          {course.description}
        </p>
      </div>

      <div>
        {/* Instructors & Modules Count */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 mb-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5 truncate max-w-[160px]">
            <svg className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {course.instructorNames.join(", ") || t("common.instructorFallback")}
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {course.weekModules.length} {t("catalog.weekDuration")}
          </span>
        </div>

        {/* Action Link */}
        <Link
          href={`/courses/${course.id}`}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/20 group-hover:shadow-blue-500/30"
        >
          {t("catalog.viewDetails")}
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
