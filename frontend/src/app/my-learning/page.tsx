"use client";

import { useEffect, useState, useSyncExternalStore, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { BookOpen, CheckCircle2, Award, Check, Eye } from "lucide-react";

import { getRpcClient } from "@/lib/connect_client";
import { LearningService, type EnrolledCourseSummary } from "@/gen/learning/v1/learning_pb";
import { CertificateService, type VerifiedCertificate } from "@/gen/certificate/v1/certificate_pb";
import { Tabs } from "@/components/ui/Tabs";
import { useAuth } from "@/components/providers/AuthProvider";

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

const emptySubscribe = () => () => {};

function MyLearningContent() {
  const { isAuthenticated } = useAuth();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const initialTab: Tab =
    tabParam && TAB_PARAM_MAP[tabParam] ? TAB_PARAM_MAP[tabParam] : "IN_PROGRESS";

  const [courses, setCourses] = useState<EnrolledCourseSummary[]>([]);
  const [certificates, setCertificates] = useState<VerifiedCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (tabParam && TAB_PARAM_MAP[tabParam]) {
      setActiveTab(TAB_PARAM_MAP[tabParam]);
    }
  }, [tabParam]);

  // Fetch enrolled courses and certificates in parallel on mount
  useEffect(() => {
    if (!isMounted) return;

    if (!isAuthenticated) {
      window.location.href = "/auth/login?redirect=/my-learning";
      return;
    }

    let isCancelled = false;

    async function fetchMyLearningData() {
      try {
        const learningClient = getRpcClient(LearningService);
        const certClient = getRpcClient(CertificateService);

        const [learningRes, certRes] = await Promise.all([
          learningClient.listMyEnrolledCourses({}),
          certClient.listMyCertificates({}).catch(() => ({ certificates: [] })),
        ]);

        if (!isCancelled) {
          setCourses(learningRes.courses || []);
          setCertificates(certRes.certificates || []);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error("Failed to fetch my learning data:", err);
          setError(err instanceof Error ? err.message : "Lỗi khi tải dữ liệu học tập");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchMyLearningData();

    return () => {
      isCancelled = true;
    };
  }, [isMounted, isAuthenticated]);

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
    <main className="w-full max-w-7xl mx-auto px-6 pt-12 pb-20 flex-1">
      <div className="w-full mb-10 text-center md:text-left max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4 text-balance">
          {"Việc học của tôi"}
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          {
            "Theo dõi tiến độ học tập, tiếp tục các khóa đang học, và xem lại chứng chỉ đã hoàn thành."
          }
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          {
            id: "IN_PROGRESS",
            label: "Đang tiến hành",
          },
          {
            id: "COMPLETED",
            label: "Đã hoàn thành",
          },
          {
            id: "CERTIFICATES",
            label: "Chứng chỉ",
          },
        ]}
        activeTab={activeTab}
        onChange={handleTabChange}
        className="mb-8"
      />

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
                className="group relative bg-card text-card-foreground border border-border rounded-3xl shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-200 ease-m3-emphasized flex flex-col justify-between"
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
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
                        {cert.partnerName}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-success/10 text-success border border-success/20 shrink-0">
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      Verified
                    </span>
                  </div>

                  {/* Course Title */}
                  <h3 className="text-lg font-bold text-foreground leading-snug line-clamp-2 mb-4 group-hover:text-primary transition-colors">
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
                      <span className="font-mono text-[11px] font-bold text-primary truncate max-w-[150px]">
                        {cert.certificateId}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-border bg-muted/50 flex items-center gap-2 rounded-b-3xl">
                  <Link
                    href={cert.verificationUrl || `/verify/${cert.certificateId}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-all cursor-pointer"
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
              className="group relative bg-card text-card-foreground border border-border rounded-2xl shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-200 ease-m3-emphasized flex flex-col h-full"
            >
              <div className="p-6 flex-1 rounded-t-2xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {course.partnerName}
                  </span>
                </div>
                <Link
                  href={`/courses/${course.courseId}`}
                  transitionTypes={["nav-forward"]}
                  className="block group-hover:text-primary transition-colors"
                >
                  <h3 className="text-lg font-bold text-foreground line-clamp-2 mb-3">
                    {course.courseTitle}
                  </h3>
                </Link>

                <div className="space-y-1.5 mb-2">
                  <div className="flex justify-between text-xs font-medium text-muted-foreground tabular-nums">
                    <span>{"Tiến độ:"}</span>
                    <span>{course.progressPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        course.progressPercent === 100
                          ? "bg-success"
                          : course.progressPercent > 0
                            ? "bg-primary"
                            : "bg-transparent"
                      }`}
                      style={{ width: `${Math.max(0, course.progressPercent)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border bg-muted/40 rounded-b-2xl">
                <Link
                  href={`/learn/${course.courseId}`}
                  transitionTypes={["nav-forward"]}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold transition-all cursor-pointer"
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
    </main>
  );
}

export default function MyLearningPage() {
  return (
    <Suspense
      fallback={
        <main className="w-full max-w-7xl mx-auto px-6 pt-12 pb-20 flex-1">
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-card border border-border rounded-2xl p-6 animate-pulse h-64"
              />
            ))}
          </div>
        </main>
      }
    >
      <MyLearningContent />
    </Suspense>
  );
}
