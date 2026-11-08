"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from "@tanstack/react-table";
import {
  Search,
  Download,
  GraduationCap,
  CheckCircle2,
  Clock,
  Award,
  ArrowUpDown,
  UserCheck,
  Cpu,
  ShieldCheck,
  AlertCircle,
  Users,
} from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Progress } from "@/components/ui/Progress";
import { Table } from "@/components/ui/Table";
import { useCourseGradebookQuery } from "@/lib/query_hooks";
import type {
  GradebookStudentRow,
  GradebookColumn as ProtoGradebookColumn,
} from "@/gen/catalog/v1/catalog_pb";

interface CourseGradebookClientProps {
  courseId: string;
}

export function CourseGradebookClient({ courseId }: CourseGradebookClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data, isLoading, isError, error } = useCourseGradebookQuery({
    courseId,
    searchQuery,
    statusFilter: statusFilter === "ALL" ? "" : statusFilter,
    pageSize: 100,
  });

  const columnsData: ProtoGradebookColumn[] = useMemo(() => data?.columns ?? [], [data?.columns]);
  const rowsData: GradebookStudentRow[] = useMemo(() => data?.rows ?? [], [data?.rows]);

  // Dynamic TanStack Table Column Definitions
  const tableColumns = useMemo<ColumnDef<GradebookStudentRow>[]>(() => {
    const cols: ColumnDef<GradebookStudentRow>[] = [
      {
        id: "student",
        header: () => (
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Users className="w-4 h-4 text-primary" aria-hidden="true" />
            <span>Học viên</span>
          </div>
        ),
        cell: ({ row }) => {
          const student = row.original;
          return (
            <div className="flex items-center gap-3 min-w-[220px]">
              <Avatar name={student.fullName || student.email} src={student.avatarUrl} size="md" />
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-foreground text-sm truncate">
                  {student.fullName || "Học viên"}
                </span>
                <span className="text-xs text-muted-foreground truncate">{student.email}</span>
                <div className="mt-1">
                  {student.isCourseCompleted ? (
                    <Badge variant="success" className="gap-1 text-[10px] px-1.5 py-0.5">
                      <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                      Đã tốt nghiệp
                    </Badge>
                  ) : student.enrollmentStatus === "IN_PROGRESS" ? (
                    <Badge variant="warning" className="gap-1 text-[10px] px-1.5 py-0.5">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      Đang học
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                      Hoạt động
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: "finalGrade",
        header: () => (
          <div className="flex items-center gap-1.5 font-bold text-foreground whitespace-nowrap">
            <Award className="w-4 h-4 text-amber-500" aria-hidden="true" />
            <span>Điểm tổng kết</span>
          </div>
        ),
        cell: ({ row }) => {
          const grade = row.original.finalWeightedGrade;
          const isPassed = grade >= 80.0;
          return (
            <div className="min-w-[130px] space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={`text-base font-extrabold ${
                    isPassed ? "text-success" : "text-muted-foreground"
                  }`}
                >
                  {grade.toFixed(1)}%
                </span>
                <span className="text-[10px] text-muted-foreground">Chuẩn: 80%</span>
              </div>
              <Progress.Linear
                value={Math.min(100, grade)}
                className="h-1.5 bg-muted"
                aria-label={`Tiến độ điểm ${grade}%`}
              />
            </div>
          );
        },
      },
    ];

    // Add Dynamic Columns for each Graded Item
    columnsData.forEach((itemCol) => {
      cols.push({
        id: `item_${itemCol.itemId}`,
        header: () => (
          <div className="min-w-[150px] max-w-[200px] space-y-1 text-left">
            <div
              className="text-xs font-semibold text-foreground truncate"
              title={itemCol.itemTitle}
            >
              {itemCol.itemTitle}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="font-medium bg-muted px-1.5 py-0.5 rounded">{itemCol.itemType}</span>
              <span>• {(itemCol.weight * 100).toFixed(0)}%</span>
            </div>
          </div>
        ),
        cell: ({ row }) => {
          const cellData = row.original.cells.find((c) => c.itemId === itemCol.itemId);
          if (!cellData || cellData.score === 0) {
            return <span className="text-muted-foreground/60 text-xs italic">Chưa có bài</span>;
          }

          const prov = cellData.provenance.toUpperCase();
          const isPassed = cellData.isPassed;

          return (
            <div className="min-w-[120px] space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-bold ${
                    isPassed ? "text-foreground" : "text-destructive"
                  }`}
                >
                  {cellData.score.toFixed(1)}
                  <span className="text-[10px] text-muted-foreground font-normal">
                    /{itemCol.maxScore || 100}
                  </span>
                </span>
                {isPassed && (
                  <CheckCircle2
                    className="w-3.5 h-3.5 text-success inline shrink-0"
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="flex items-center gap-1">
                {prov === "TA" && (
                  <Badge variant="primary" className="text-[9px] px-1 py-0 gap-0.5">
                    <UserCheck className="w-2.5 h-2.5" aria-hidden="true" /> TA
                  </Badge>
                )}
                {prov === "INSTRUCTOR" && (
                  <Badge variant="primary" className="text-[9px] px-1 py-0 gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" aria-hidden="true" /> Giảng viên
                  </Badge>
                )}
                {prov === "PEER" && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 gap-0.5">
                    <Users className="w-2.5 h-2.5" aria-hidden="true" /> Bạn học
                  </Badge>
                )}
                {prov === "AUTO" && (
                  <Badge variant="outlined" className="text-[9px] px-1 py-0 gap-0.5">
                    <Cpu className="w-2.5 h-2.5" aria-hidden="true" /> Máy
                  </Badge>
                )}
              </div>
            </div>
          );
        },
      });
    });

    return cols;
  }, [columnsData]);

  const table = useReactTable({
    data: rowsData,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Calculate Overview Stats
  const totalStudents = rowsData.length;
  const completedCount = rowsData.filter((r) => r.isCourseCompleted).length;
  const avgGrade =
    totalStudents > 0
      ? rowsData.reduce((acc, r) => acc + r.finalWeightedGrade, 0) / totalStudents
      : 0;

  // Handle CSV Export
  const handleExportCSV = () => {
    if (!rowsData.length) return;
    const headerRow = [
      "ID",
      "Họ và tên",
      "Email",
      "Trạng thái",
      "Điểm tổng kết (%)",
      ...columnsData.map((c) => `"${c.itemTitle} (${(c.weight * 100).toFixed(0)}%)"`),
    ];

    const bodyRows = rowsData.map((student) => [
      student.userId,
      `"${student.fullName || ""}"`,
      student.email,
      student.isCourseCompleted ? "Đã tốt nghiệp" : student.enrollmentStatus,
      student.finalWeightedGrade.toFixed(2),
      ...columnsData.map((c) => {
        const cell = student.cells.find((cellItem) => cellItem.itemId === c.itemId);
        return cell ? cell.score.toFixed(1) : "0";
      }),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headerRow.join(","), ...bodyRows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `so_diem_khoa_hoc_${courseId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb Navigation */}
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
              <Breadcrumb.Page>Sổ điểm (Course Gradebook)</Breadcrumb.Page>
            </Breadcrumb.Item>
          </Breadcrumb.List>
        </Breadcrumb>

        {/* Header Title & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-3xl border border-border shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-7 h-7 text-primary" aria-hidden="true" />
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                Sổ điểm Khóa học
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.courseTitle || `Khóa học #${courseId}`} • Theo dõi ma trận điểm số sinh viên và
              tiến độ hoàn thành theo thời gian thực.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outlined"
              onClick={handleExportCSV}
              disabled={rowsData.length === 0}
              className="w-full sm:w-auto text-xs font-bold gap-1.5"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Xuất file CSV</span>
            </Button>
            <Button
              type="button"
              variant="filled"
              render={<Link href={`/instructor/courses/${courseId}/grading`} />}
              className="w-full sm:w-auto text-xs font-bold gap-1.5 shrink-0"
            >
              <UserCheck className="w-4 h-4" aria-hidden="true" />
              <span>Bàn làm việc Chấm bài</span>
            </Button>
          </div>
        </div>

        {/* Metric Cards Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">Tổng học viên ghi danh</span>
              <Users className="w-4 h-4 text-primary" aria-hidden="true" />
            </div>
            <div className="text-2xl font-black text-foreground">{totalStudents}</div>
            <p className="text-[11px] text-muted-foreground">
              Bao gồm toàn bộ học viên đang học và đã hoàn thành
            </p>
          </div>

          <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">Tỷ lệ tốt nghiệp (≥80%)</span>
              <Award className="w-4 h-4 text-success" aria-hidden="true" />
            </div>
            <div className="text-2xl font-black text-success">
              {totalStudents > 0 ? `${((completedCount / totalStudents) * 100).toFixed(1)}%` : "0%"}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {completedCount} / {totalStudents} học viên đã hoàn thành điều kiện cấp bằng
            </p>
          </div>

          <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">Điểm trung bình toàn lớp</span>
              <ArrowUpDown className="w-4 h-4 text-warning" aria-hidden="true" />
            </div>
            <div className="text-2xl font-black text-foreground">{avgGrade.toFixed(1)}%</div>
            <p className="text-[11px] text-muted-foreground">
              Tính toán tự động theo trọng số từng cột bài tập
            </p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search
              className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <Input
              type="text"
              placeholder="Tìm theo tên hoặc email sinh viên…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Trạng thái:</span>
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
              <Select.Item value="ALL">Tất cả trạng thái</Select.Item>
              <Select.Item value="COMPLETED">Đã tốt nghiệp</Select.Item>
              <Select.Item value="IN_PROGRESS">Đang học</Select.Item>
              <Select.Item value="ACTIVE">Mới kích hoạt</Select.Item>
            </Select>
          </div>
        </div>

        {/* TanStack Table Data View */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 text-muted-foreground space-y-3 bg-card rounded-2xl border border-border">
            <Progress.Circular size="md" ariaLabel="Đang tải dữ liệu sổ điểm" />
            <p className="text-sm">Đang tải ma trận Sổ điểm khóa học…</p>
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-destructive bg-destructive/10 rounded-2xl border border-destructive/20 space-y-2">
            <AlertCircle className="w-6 h-6 mx-auto" aria-hidden="true" />
            <h3 className="font-bold text-sm">Không thể tải Sổ điểm khóa học</h3>
            <p className="text-xs text-muted-foreground">
              {error?.message || "Đã xảy ra lỗi khi kết nối tới máy chủ."}
            </p>
          </div>
        ) : rowsData.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground bg-card rounded-2xl border border-dashed border-border space-y-3">
            <GraduationCap
              className="w-10 h-10 mx-auto text-muted-foreground/60"
              aria-hidden="true"
            />
            <h3 className="font-semibold text-foreground text-sm">Chưa có dữ liệu học viên</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Chưa có học viên nào ghi danh hoặc không tìm thấy kết quả phù hợp với bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <Table>
              <Table.Header>
                {table.getHeaderGroups().map((headerGroup) => (
                  <Table.Row key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <Table.Head key={header.id} className="py-3 px-4">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </Table.Head>
                    ))}
                  </Table.Row>
                ))}
              </Table.Header>
              <Table.Body>
                {table.getRowModel().rows.map((row) => (
                  <Table.Row key={row.id} className="hover:bg-muted/40 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell key={cell.id} className="py-3 px-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
}
