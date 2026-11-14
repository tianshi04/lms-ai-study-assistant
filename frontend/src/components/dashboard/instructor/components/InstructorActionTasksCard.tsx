"use client";

import React from "react";
import Link from "next/link";
import { CheckSquare, MessageSquare, FileText, ChevronRight, Clock } from "lucide-react";
import type { OverviewActionTask } from "../types";

interface InstructorActionTasksCardProps {
  tasks: OverviewActionTask[];
}

export function InstructorActionTasksCard({ tasks }: InstructorActionTasksCardProps) {
  return (
    <div className="p-4.5 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-outline-variant/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CheckSquare className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Việc Cần Xử Lý
          </h3>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-warning/15 text-warning border border-warning/20">
          {tasks.length} nhiệm vụ
        </span>
      </div>

      {/* Danh sách nhiệm vụ có gắn chỉ số thời gian SLA */}
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="p-5 rounded-2xl bg-surface border border-outline-variant/60 text-center space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">
              Không có nhiệm vụ cần xử lý
            </p>
            <p className="text-[11px] text-muted-foreground/80">
              Tất cả bài tập và khiếu nại đã được giải quyết.
            </p>
          </div>
        ) : (
          tasks.map((task) => {
            const isGrading = task.type === "grading";
            const isQA = task.type === "video_qa";

            return (
              <div
                key={task.id}
                className="p-3 rounded-2xl bg-surface border border-outline-variant/60 hover:border-primary/40 transition-all space-y-1.5 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`p-1 rounded-md shrink-0 ${
                        isGrading
                          ? "bg-primary/10 text-primary"
                          : isQA
                            ? "bg-warning/10 text-warning"
                            : "bg-success/10 text-success"
                      }`}
                    >
                      {isGrading ? (
                        <CheckSquare className="w-3 h-3" />
                      ) : isQA ? (
                        <MessageSquare className="w-3 h-3" />
                      ) : (
                        <FileText className="w-3 h-3" />
                      )}
                    </span>
                    <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {task.title}
                    </h4>
                  </div>

                  <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {task.timeAgo}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="truncate max-w-[180px]">
                    {task.studentName} • {task.courseTitle}
                  </span>

                  <Link
                    href={task.actionUrl}
                    className="font-bold text-primary hover:underline flex items-center gap-0.5 shrink-0"
                  >
                    <span>{task.actionText}</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
