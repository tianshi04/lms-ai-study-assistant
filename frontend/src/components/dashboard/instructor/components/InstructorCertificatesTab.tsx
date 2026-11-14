"use client";

import React from "react";
import { Table } from "@/components/ui/Table";
import type { OverviewCertificate } from "../types";

export interface SpecificCompletedStudent {
  userId: string;
  userName: string;
  userEmail: string;
  enrolledAt?: string;
}

export type InstructorCertificatesTabProps =
  | {
      mode: "all";
      certificates: OverviewCertificate[];
      totalCount: number;
    }
  | {
      mode: "specific";
      completedStudents: SpecificCompletedStudent[];
    };

export function InstructorCertificatesTab(props: InstructorCertificatesTabProps) {
  if (props.mode === "all") {
    const { certificates, totalCount } = props;
    return (
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Các chứng chỉ số đã cấp cho sinh viên hoàn thành toàn diện khóa học (
            {certificates.length}/{totalCount} chứng chỉ):
          </span>
          <span className="text-[11px] text-muted-foreground font-mono">
            Cuộn để xem toàn bộ danh sách
          </span>
        </div>

        <div className="rounded-2xl border border-outline-variant/60 overflow-hidden bg-surface max-h-[290px] overflow-y-auto">
          <Table>
            <Table.Header className="sticky top-0 z-10 bg-surface shadow-xs">
              <Table.Row className="bg-muted/40 text-[11px]">
                <Table.Head>Mã chứng chỉ</Table.Head>
                <Table.Head>Học viên</Table.Head>
                <Table.Head>Khóa học</Table.Head>
                <Table.Head className="text-right">Ngày cấp</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {certificates.length === 0 ? (
                <Table.Row>
                  <Table.Cell
                    colSpan={4}
                    className="text-center py-8 text-xs text-muted-foreground"
                  >
                    Không tìm thấy chứng chỉ nào phù hợp với bộ lọc khóa học.
                  </Table.Cell>
                </Table.Row>
              ) : (
                certificates.map((st, idx) => (
                  <Table.Row key={st.certId || `cert-${idx}`} className="text-xs hover:bg-muted/30">
                    <Table.Cell className="font-mono text-[11px] text-primary font-semibold">
                      {st.certId}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="font-bold text-foreground">{st.userName}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {st.userEmail}
                      </div>
                    </Table.Cell>
                    <Table.Cell className="truncate max-w-[200px] text-muted-foreground">
                      {st.courseTitle}
                    </Table.Cell>
                    <Table.Cell className="text-right font-mono text-muted-foreground">
                      {st.issueDate}
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table>
        </div>
      </div>
    );
  }

  // mode === "specific"
  const { completedStudents } = props;
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Danh sách sinh viên đã hoàn thành 100% nội dung và được cấp chứng chỉ số:
      </p>

      <div className="rounded-2xl border border-outline-variant/60 overflow-hidden bg-surface max-h-[290px] overflow-y-auto">
        <Table>
          <Table.Header className="sticky top-0 z-10 bg-surface shadow-xs">
            <Table.Row className="bg-muted/40 text-[11px]">
              <Table.Head>Mã chứng chỉ</Table.Head>
              <Table.Head>Học viên</Table.Head>
              <Table.Head>Ngày hoàn thành</Table.Head>
              <Table.Head className="text-right">Trạng thái</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {completedStudents.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={4} className="text-center py-8 text-xs text-muted-foreground">
                  Chưa có học viên nào hoàn tất 100% khóa học để cấp chứng chỉ.
                </Table.Cell>
              </Table.Row>
            ) : (
              completedStudents.map((st) => (
                <Table.Row key={st.userId} className="text-xs">
                  <Table.Cell className="font-mono text-[11px] text-primary font-semibold">
                    CERT-{st.userId.slice(0, 8).toUpperCase()}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="font-bold text-foreground">{st.userName}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {st.userEmail}
                    </div>
                  </Table.Cell>
                  <Table.Cell className="font-mono text-[11px] text-muted-foreground">
                    {st.enrolledAt
                      ? new Date(st.enrolledAt).toLocaleDateString("vi-VN")
                      : "02/11/2026"}
                  </Table.Cell>
                  <Table.Cell className="text-right font-mono font-bold text-success">
                    100% Hoàn thành
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table>
      </div>
    </div>
  );
}
