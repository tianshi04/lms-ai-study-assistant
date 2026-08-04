"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";

import { getRpcClient } from "@/lib/connect_client";
import { LearningService, type EnrolledCourseSummary } from "@/gen/learning/v1/learning_pb";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/components/providers/AuthProvider";

type Tab = "ALL" | "IN_PROGRESS" | "COMPLETED";

const emptySubscribe = () => () => {};

export default function MyCoursesPage() {
  const { isAuthenticated } = useAuth();
  const [courses, setCourses] = useState<EnrolledCourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("ALL");

  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!isMounted) return;

    if (!isAuthenticated) {
      window.location.href = "/auth/login?redirect=/my-courses";
      return;
    }

    let isCancelled = false;

    async function fetchMyCourses() {
      try {
        const client = getRpcClient(LearningService);
        const res = await client.listMyEnrolledCourses({});
        if (!isCancelled) {
          setCourses(res.courses || []);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error("Failed to fetch my courses:", err);
          setError(err instanceof Error ? err.message : "Lỗi khi tải danh sách khóa học");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchMyCourses();

    return () => {
      isCancelled = true;
    };
  }, [isMounted]);

  const filteredCourses = courses.filter((c) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "IN_PROGRESS")
      return c.status === "IN_PROGRESS" || c.status === "NOT_STARTED";
    if (activeTab === "COMPLETED") return c.status === "COMPLETED";
    return true;
  });

  return (
    <main className="w-full max-w-7xl mx-auto px-6 pt-12 pb-20 flex-1">
      <div className="w-full mb-10 text-center md:text-left max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4 text-balance">
          {"Khóa học của tôi"}
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
          { id: "ALL", label: "Tất cả", count: courses.length },
          {
            id: "IN_PROGRESS",
            label: "Đang học",
            count: courses.filter((c) => c.status === "IN_PROGRESS" || c.status === "NOT_STARTED")
              .length,
          },
          {
            id: "COMPLETED",
            label: "Hoàn thành",
            count: courses.filter((c) => c.status === "COMPLETED").length,
          },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as Tab)}
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
      ) : filteredCourses.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <BookOpen
            className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4"
            aria-hidden="true"
          />
          <h3 className="text-lg font-bold text-foreground mb-2">{"Chưa có khóa học nào"}</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {"Bạn chưa ghi danh vào khóa học nào. Hãy bắt đầu hành trình học tập ngay hôm nay!"}
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold transition-colors cursor-pointer"
          >
            {"Khám phá danh mục"}
          </Link>
        </div>
      ) : (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-6">
          {filteredCourses.map((course) => (
            <div
              key={course.courseId}
              className="group relative bg-card text-card-foreground border border-border rounded-2xl shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-200 ease-m3-emphasized flex flex-col h-full"
            >
              <div className="p-6 flex-1 rounded-t-2xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {course.partnerName}
                  </span>
                  {course.status === "COMPLETED" ? (
                    <Badge variant="success" className="text-[10px]">
                      ✓ {"Hoàn thành"}
                    </Badge>
                  ) : course.status === "IN_PROGRESS" ? (
                    <Badge variant="primary" className="text-[10px]">
                      {"Đang học"}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      {"Chưa bắt đầu"}
                    </Badge>
                  )}
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
