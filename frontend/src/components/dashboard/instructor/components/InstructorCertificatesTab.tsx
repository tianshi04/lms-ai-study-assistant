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
      totalCount?: number;
    }
  | {
      mode: "specific";
      completedStudents: SpecificCompletedStudent[];
    };

export function InstructorCertificatesTab(props: InstructorCertificatesTabProps) {
  if (props.mode === "all") {
    const { certificates } = props;
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-outline-variant/60 overflow-hidden bg-surface min-h-[380px] max-h-[410px] overflow-y-auto">
          <Table>
            <Table.Header className="sticky top-0 z-10 bg-surface shadow-xs">
              <Table.Row className="bg-muted/40 text-[11px]">
                <Table.Head className="py-2.5">Mã chứng chỉ</Table.Head>
                <Table.Head className="py-2.5">Học viên</Table.Head>
                <Table.Head className="py-2.5">Khóa học</Table.Head>
                <Table.Head className="text-right py-2.5">Ngày cấp</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {certificates.length === 0 ? (
                <Table.Row>
                  <Table.Cell
                    colSpan={4}
                    className="text-center py-24 text-xs text-muted-foreground"
                  >
                    Chưa có chứng chỉ nào được cấp trên toàn hệ thống.
                  </Table.Cell>
                </Table.Row>
              ) : (
                certificates.map((st, idx) => (
                  <Table.Row key={`${st.certId}-${idx}`} className="text-xs hover:bg-muted/30">
                    <Table.Cell className="font-mono text-[11px] text-primary font-semibold py-3.5">
                      {st.certId}
                    </Table.Cell>
                    <Table.Cell className="py-3.5">
                      <div className="font-bold text-foreground">{st.userName}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {st.userEmail}
                      </div>
                    </Table.Cell>
                    <Table.Cell className="text-muted-foreground py-3.5">
                      {st.courseTitle}
                    </Table.Cell>
                    <Table.Cell className="text-right font-mono text-muted-foreground py-3.5">
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
      <div className="rounded-2xl border border-outline-variant/60 overflow-hidden bg-surface min-h-[380px] max-h-[410px] overflow-y-auto">
        <Table>
          <Table.Header className="sticky top-0 z-10 bg-surface shadow-xs">
            <Table.Row className="bg-muted/40 text-[11px]">
              <Table.Head className="py-2.5">Mã chứng chỉ</Table.Head>
              <Table.Head className="py-2.5">Học viên</Table.Head>
              <Table.Head className="py-2.5">Ngày hoàn thành</Table.Head>
              <Table.Head className="text-right py-2.5">Trạng thái</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {completedStudents.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={4} className="text-center py-24 text-xs text-muted-foreground">
                  Chưa có học viên nào hoàn tất 100% khóa học để cấp chứng chỉ.
                </Table.Cell>
              </Table.Row>
            ) : (
              completedStudents.map((st, idx) => (
                <Table.Row key={`${st.userId}-${idx}`} className="text-xs hover:bg-muted/30">
                  <Table.Cell className="font-mono text-[11px] text-primary font-semibold py-3.5">
                    CERT-
                    {st.userId
                      .replace(/^user_/, "")
                      .slice(0, 10)
                      .toUpperCase()}
                  </Table.Cell>
                  <Table.Cell className="py-3.5">
                    <div className="font-bold text-foreground">{st.userName}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {st.userEmail}
                    </div>
                  </Table.Cell>
                  <Table.Cell className="font-mono text-[11px] text-muted-foreground py-3.5">
                    {st.enrolledAt
                      ? new Date(st.enrolledAt).toLocaleDateString("vi-VN")
                      : "02/11/2026"}
                  </Table.Cell>
                  <Table.Cell className="text-right font-mono font-bold text-success py-3.5">
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
