"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { BookOpen, CheckCircle2, Award, Check, Eye } from "lucide-react";

import { Tabs } from "@/components/ui/Tabs";
import { Progress } from "@/components/ui/Progress";
import { useAuth } from "@/components/providers/AuthProvider";
import { useMyEnrolledCoursesQuery, useMyCertificatesQuery } from "@/lib/query_hooks";

type Tab = "IN_PROGRESS" | "COMPLETED" | "CERTIFICATES";

const TAB_PARAM_MAP: Record<string, Tab> = {
  "in-progress": "IN_PROGRESS",
  completed: "COMPLETED",
  certificates: "CERTIFICATES",
};

const TAB_TO_PARAM: Record<Tab, string> = {
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  CERTIFICATES: "certificates",
};

export function MyLearningClient() {
  const { isAuthenticated } = useAuth();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const initialTab: Tab =
    tabParam && TAB_PARAM_MAP[tabParam] ? TAB_PARAM_MAP[tabParam] : "IN_PROGRESS";

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  useEffect(() => {
    if (tabParam && TAB_PARAM_MAP[tabParam]) {
      setActiveTab(TAB_PARAM_MAP[tabParam]);
    }
  }, [tabParam]);

  // Use TanStack Query hooks for automatic background caching & instant re-hydration
  const {
    data: courses = [],
    isLoading: loadingCourses,
    error: coursesError,
  } = useMyEnrolledCoursesQuery({ enabled: isAuthenticated });

  const {
    data: certificates = [],
    isLoading: loadingCertificates,
    error: certsError,
  } = useMyCertificatesQuery({ enabled: isAuthenticated });

  const loading = loadingCourses || loadingCertificates;
  const error = coursesError?.message || certsError?.message || null;

  const handleTabChange = (id: string) => {
    const newTab = id as Tab;
    setActiveTab(newTab);
    const param = TAB_TO_PARAM[newTab];
    if (param && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", param);
      window.history.replaceState(null, "", url.toString());
    }
  };

  const inProgressCourses = courses.filter(
    (c) => c.status === "IN_PROGRESS" || c.status === "NOT_STARTED",
  );
  const completedCourses = courses.filter((c) => c.status === "COMPLETED");

  return (
    <>
      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={(val) => handleTabChange(val as string)}>
        <Tabs.List className="mb-8">
          <Tabs.Tab value="IN_PROGRESS">
            <span>{"Đang tiến hành"}</span>
          </Tabs.Tab>
          <Tabs.Tab value="COMPLETED">
            <span>{"Đã hoàn thành"}</span>
          </Tabs.Tab>
          <Tabs.Tab value="CERTIFICATES">
            <span>{"Chứng chỉ"}</span>
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.Root>

      {/* Content Section */}
      {loading ? (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="bg-card border border-border rounded-2xl p-6 animate-pulse shadow-sm flex flex-col justify-between h-64"
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="h-3 bg-muted rounded w-1/4" />
                  <div className="h-4 bg-muted rounded w-1/5" />
                </div>
                <div className="h-6 bg-muted rounded w-3/4 mb-3" />
                <div className="h-4 bg-muted rounded w-1/2 mb-6" />
              </div>
              <div>
                <div className="h-2 bg-muted rounded mb-4" />
                <div className="h-10 bg-muted rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-6 rounded-2xl text-center">
          <p className="font-semibold">{error}</p>
        </div>
      ) : activeTab === "CERTIFICATES" ? (
        certificates.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Award className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" aria-hidden="true" />
            <h3 className="text-lg font-bold text-foreground mb-2">{"Chưa có chứng chỉ nào"}</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {"Bạn chưa đạt được chứng chỉ nào. Hãy hoàn thành khóa học để nhận chứng chỉ."}
            </p>
            <Link
              href="/courses"
              prefetch={true}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold transition-colors cursor-pointer"
            >
              {"Khám phá khóa học"}
            </Link>
          </div>
        ) : (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-6">
            {certificates.map((cert) => (
              <div
                key={cert.certificateId}
                className="group relative bg-card text-card-foreground border border-border rounded-3xl shadow-sm hover:shadow-md hover:border-primary/40 transition-colors duration-m3-short-4 ease-m3-emphasized flex flex-col justify-between"
              >
                <div className="p-6 rounded-t-3xl">
                  {/* Header Badge & Partner */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      {cert.partnerLogoUrl ? (
                        <Image
                          src={cert.partnerLogoUrl}
                          alt={cert.partnerName}
                          width={28}
                          height={28}
                          unoptimized
                          className="w-7 h-7 object-contain rounded"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {cert.partnerName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground min-w-0 truncate">
                        {cert.partnerName}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-success/10 text-success border border-success/20 shrink-0">
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      Verified
                    </span>
                  </div>

                  {/* Course Title */}
                  <h3 className="text-lg font-bold text-foreground leading-snug min-w-0 line-clamp-2 mb-4 group-hover:text-primary transition-colors">
                    {cert.courseTitle}
                  </h3>

                  {/* Details */}
                  <div className="space-y-2 text-xs text-muted-foreground bg-muted p-3.5 rounded-2xl border border-border">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{"Cấp ngày"}:</span>
                      <span className="font-semibold text-foreground">{cert.issueDate}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{"Mã chứng chỉ"}:</span>
                      <span className="font-mono text-[11px] font-bold text-primary min-w-0 truncate max-w-[150px]">
                        {cert.certificateId}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-border bg-muted/50 flex items-center gap-2 rounded-b-3xl">
                  <Link
                    href={cert.verificationUrl || `/verify/${cert.certificateId}`}
                    prefetch={true}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Eye className="w-4 h-4" aria-hidden="true" />
                    <span>{"Xem chứng chỉ"}</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === "IN_PROGRESS" && inProgressCourses.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <BookOpen
            className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4"
            aria-hidden="true"
          />
          <h3 className="text-lg font-bold text-foreground mb-2">
            {"Không có khóa học nào đang tiến hành"}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {
              "Bạn chưa ghi danh khóa học nào hoặc đã hoàn thành tất cả. Khám phá các khóa học mới ngay!"
            }
          </p>
          <Link
            href="/courses"
            prefetch={true}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold transition-colors cursor-pointer"
          >
            {"Khám phá danh mục"}
          </Link>
        </div>
      ) : activeTab === "COMPLETED" && completedCourses.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <CheckCircle2
            className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4"
            aria-hidden="true"
          />
          <h3 className="text-lg font-bold text-foreground mb-2">
            {"Chưa có khóa học nào hoàn thành"}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {"Hãy tiếp tục hoàn thành các bài học và kiểm tra để nhận chứng chỉ!"}
          </p>
        </div>
      ) : (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-6">
          {(activeTab === "IN_PROGRESS" ? inProgressCourses : completedCourses).map((course) => (
            <div
              key={course.courseId}
              className="group relative bg-card text-card-foreground border border-border rounded-2xl shadow-sm hover:shadow-md hover:border-primary/40 transition-colors duration-m3-short-4 ease-m3-emphasized flex flex-col h-full"
            >
              <div className="p-6 flex-1 rounded-t-2xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {course.partnerName}
                  </span>
                </div>
                <Link
                  href={`/courses/${course.courseId}`}
                  prefetch={true}
                  className="block group-hover:text-primary transition-colors"
                >
                  <h3 className="text-lg font-bold text-foreground min-w-0 line-clamp-2 mb-3">
                    {course.courseTitle}
                  </h3>
                </Link>

                <div className="mb-2">
                  <Progress.Linear value={course.progressPercent} showLabel label="Tiến độ" />
                </div>
              </div>

              <div className="p-4 border-t border-border bg-muted/40 rounded-b-2xl">
                <Link
                  href={`/learn/${course.courseId}`}
                  prefetch={true}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold transition-colors cursor-pointer"
                >
                  {course.status === "COMPLETED"
                    ? "Đánh giá khóa học"
                    : course.status === "NOT_STARTED"
                      ? "Bắt đầu học"
                      : "Tiếp tục học"}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
