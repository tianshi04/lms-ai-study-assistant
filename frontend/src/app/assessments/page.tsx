"use client";

import React, { useState } from "react";
import { FileText, Code2, Users } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { GradedQuizRunner } from "@/components/assessment/GradedQuizRunner";
import { AutoGradedLabRunner } from "@/components/assessment/AutoGradedLabRunner";
import { PeerAssignmentWorkspace } from "@/components/assessment/PeerAssignmentWorkspace";

export default function AssessmentsPage() {
  const [activeAssessment, setActiveAssessment] = useState<"quiz" | "lab" | "peer">("quiz");
  const [quizItemId, setQuizItemId] = useState("item-ml-quiz-2");
  const [labItemId, setLabItemId] = useState("item-ml-lab-1");
  const [peerItemId, setPeerItemId] = useState("item-ml-peer-1");

  return (
    <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-info/10 text-info border border-info/20">
              BÀI KIỂM TRẢ &amp; ĐÁNH GIÁ
            </span>
            <span className="text-xs text-muted-foreground">
              Hệ thống Tự động Chấm điểm &amp; Đánh giá Ngang hàng
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-foreground text-balance">
            Thử nghiệm Bài kiểm tra &amp; Auto-Grader
          </h1>
        </div>

        {/* Assessment Selector Tabs */}
        <div className="flex items-center gap-1.5 bg-muted p-1.5 rounded-2xl border border-border shadow-inner">
          <Button
            type="button"
            variant="text"
            onClick={() => setActiveAssessment("quiz")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeAssessment === "quiz"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-4 h-4 text-primary" aria-hidden="true" />
            Bài trắc nghiệm (Đạt 80%)
          </Button>
          <Button
            type="button"
            variant="text"
            onClick={() => setActiveAssessment("lab")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeAssessment === "lab"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code2 className="w-4 h-4 text-accent-foreground" aria-hidden="true" />
            Thực hành Lab tự chấm
          </Button>
          <Button
            type="button"
            variant="text"
            onClick={() => setActiveAssessment("peer")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeAssessment === "peer"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4 text-secondary" aria-hidden="true" />
            Đánh giá ngang hàng &amp; Phúc khảo
          </Button>
        </div>
      </div>
      {/* Item ID Configuration */}
      <div className="flex items-center gap-3 bg-muted p-4 rounded-xl border border-border">
        <label
          htmlFor="itemId"
          className="text-sm font-semibold text-muted-foreground whitespace-nowrap"
        >
          Current Item ID:
        </label>
        <Input
          id="itemId"
          type="text"
          className="flex-1 max-w-sm"
          value={
            activeAssessment === "quiz"
              ? quizItemId
              : activeAssessment === "lab"
                ? labItemId
                : peerItemId
          }
          onChange={(e) => {
            if (activeAssessment === "quiz") setQuizItemId(e.target.value);
            if (activeAssessment === "lab") setLabItemId(e.target.value);
            if (activeAssessment === "peer") setPeerItemId(e.target.value);
          }}
          placeholder="Enter Item ID…"
        />
      </div>

      {/* Selected Assessment Runner Component */}
      <div className="transition-colors duration-m3-medium-2 ease-m3-emphasized">
        {activeAssessment === "quiz" && <GradedQuizRunner itemId={quizItemId} />}
        {activeAssessment === "lab" && <AutoGradedLabRunner itemId={labItemId} />}
        {activeAssessment === "peer" && <PeerAssignmentWorkspace itemId={peerItemId} />}
      </div>
    </main>
  );
}
