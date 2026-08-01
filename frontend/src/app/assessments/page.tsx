"use client";

import React, { useState } from "react";
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
              TRACK B ASSESSMENTS
            </span>
            <span className="text-xs text-muted-foreground">
              Coursera Auto-Grader &amp; Peer Review Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-foreground text-balance">
            Assessments &amp; Auto-Grader Sandbox
          </h1>
        </div>

        {/* Assessment Selector Tabs */}
        <div className="flex items-center gap-1.5 bg-muted p-1.5 rounded-2xl border border-border shadow-inner">
          <button
            onClick={() => setActiveAssessment("quiz")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeAssessment === "quiz"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <svg
              className="w-4 h-4 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Graded Quiz (80% Pass)
          </button>
          <button
            onClick={() => setActiveAssessment("lab")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeAssessment === "lab"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <svg
              className="w-4 h-4 text-accent-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
            Auto-Graded Lab
          </button>
          <button
            onClick={() => setActiveAssessment("peer")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeAssessment === "peer"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <svg
              className="w-4 h-4 text-success"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Peer Review &amp; Appeal
          </button>
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
        <input
          id="itemId"
          type="text"
          className="flex-1 max-w-sm px-3 py-1.5 bg-card border border-input rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-foreground transition-colors"
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
      <div className="transition-all duration-300">
        {activeAssessment === "quiz" && <GradedQuizRunner itemId={quizItemId} />}
        {activeAssessment === "lab" && <AutoGradedLabRunner itemId={labItemId} />}
        {activeAssessment === "peer" && <PeerAssignmentWorkspace itemId={peerItemId} />}
      </div>
    </main>
  );
}
