"use client";

import { useEffect, useState, use, Suspense } from "react";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService, type InstructorAnalytics } from "@/gen/catalog/v1/catalog_pb";
import { Users } from "lucide-react";
import { Surface } from "@/components/ui/Surface";
import { Table } from "@/components/ui/Table";
import { Progress } from "@/components/ui/Progress";

import { Breadcrumb } from "@/components/ui/Breadcrumb";

function InstructorAnalyticsContent({ params }: { params: Promise<{ courseId: string }> }) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.courseId;

  const [analytics, setAnalytics] = useState<InstructorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const client = getRpcClient(CatalogService);
        const res = await client.getInstructorAnalytics({ courseId });
        if (res.analytics) {
          setAnalytics(res.analytics);
        }
      } catch (err: unknown) {
        console.error("Failed to load instructor analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [courseId]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors">
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <Breadcrumb>
            <Breadcrumb.List className="text-xs">
              <Breadcrumb.Item>
                <Breadcrumb.Link href="/instructor/courses">Giảng viên</Breadcrumb.Link>
              </Breadcrumb.Item>
              <Breadcrumb.Separator />
              <Breadcrumb.Item>
                <Breadcrumb.Link href={`/instructor/courses/${courseId}`}>
                  Chi tiết khóa học
                </Breadcrumb.Link>
              </Breadcrumb.Item>
              <Breadcrumb.Separator />
              <Breadcrumb.Item>
                <Breadcrumb.Page>Thống kê lớp học</Breadcrumb.Page>
              </Breadcrumb.Item>
            </Breadcrumb.List>
          </Breadcrumb>

          <Link
            href={`/instructor/courses/${courseId}`}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            Quay lại Biên soạn
          </Link>
        </div>

        {/* Page Header */}
        <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 text-success text-xs font-extrabold uppercase mb-2">
              Instructor Analytics & Student Roster
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground text-balance">
              Thống kê & Danh sách Học viên
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Theo dõi tình hình ghi danh, tiến độ học tập và mức độ hài lòng của sinh viên theo
              thời gian thực.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center">
            <Progress.Circular color="success" size="md" className="mx-auto mb-3" />
            <span aria-live="polite">Đang tổng hợp dữ liệu học tập…</span>
          </div>
        ) : !analytics ? (
          <Surface
            variant="low"
            shape="2xl"
            className="py-12 text-center text-muted-foreground p-6"
          >
            Không tìm thấy dữ liệu thống kê cho khóa học này.
          </Surface>
        ) : (
          <div className="space-y-8">
            {/* Stat Cards Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Surface variant="low" shape="2xl" className="space-y-2 p-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tổng Học Viên
                </span>
                <div className="text-3xl font-black text-primary">
                  {analytics.totalEnrolledStudents}
                </div>
                <p className="text-xs text-muted-foreground">Học viên đã ghi danh</p>
              </Surface>

              <Surface variant="low" shape="2xl" className="space-y-2 p-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tỷ Lệ Hoàn Thành
                </span>
                <div className="text-3xl font-black text-success">
                  {analytics.averageCompletionRate}%
                </div>
                <p className="text-xs text-muted-foreground">Tiến độ hoàn thành trung bình</p>
              </Surface>

              <Surface variant="low" shape="2xl" className="space-y-2 p-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Đánh Giá Trung Bình
                </span>
                <div className="text-3xl font-black text-warning flex items-center gap-1">
                  <span>{analytics.averageRating.toFixed(1)}</span>
                  <span className="text-lg">★</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Dựa trên {analytics.reviewCount} nhận xét
                </p>
              </Surface>

              <Surface variant="low" shape="2xl" className="space-y-2 p-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Trạng Thái Khóa Học
                </span>
                <div className="text-xl font-bold text-primary pt-1">Đang hoạt động</div>
                <p className="text-xs text-muted-foreground">Mở ghi danh công khai</p>
              </Surface>
            </div>

            {/* Enrolled Students Table */}
            <Surface variant="low" shape="2xl" className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-success" aria-hidden="true" />
                  Danh sách Học viên Lớp học ({analytics.students.length})
                </h2>
              </div>

              {analytics.students.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  Chưa có dữ liệu học viên tham gia khóa học này.
                </div>
              ) : (
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>Tên / Email</Table.Head>
                      <Table.Head>Mã Học Viên</Table.Head>
                      <Table.Head className="text-center">Tiến Độ Học Tập</Table.Head>
                      <Table.Head className="text-right">Trạng Thái</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {analytics.students.map((student) => (
                      <Table.Row key={student.userId}>
                        <Table.Cell className="font-semibold">
                          <div>{student.userName}</div>
                          <div className="text-xs font-mono font-normal text-muted-foreground">
                            {student.userEmail || "Learner"}
                          </div>
                        </Table.Cell>
                        <Table.Cell className="font-mono text-xs text-muted-foreground">
                          {student.userId}
                        </Table.Cell>
                        <Table.Cell className="text-center">
                          <div className="flex items-center justify-center gap-3">
                            <div className="w-32">
                              <Progress.Linear value={Math.min(100, student.progressPercent)} />
                            </div>
                            <span className="text-xs font-bold text-foreground font-mono">
                              {student.progressPercent.toFixed(1)}%
                            </span>
                          </div>
                        </Table.Cell>
                        <Table.Cell className="text-right">
                          {student.progressPercent >= 100 ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-success/10 text-success">
                              HOÀN THÀNH
                            </span>
                          ) : student.progressPercent > 0 ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-primary/10 text-primary">
                              ĐANG HỌC
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-muted text-muted-foreground">
                              MỚI GHI DANH
                            </span>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              )}
            </Surface>
          </div>
        )}
      </main>
    </div>
  );
}

export default function InstructorAnalyticsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-muted-foreground animate-pulse">
          Đang tải dữ liệu thống kê…
        </div>
      }
    >
      <InstructorAnalyticsContent params={params} />
    </Suspense>
  );
}
