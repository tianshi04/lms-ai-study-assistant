"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { GradedQuizRunner } from "@/components/assessment/GradedQuizRunner";
import { AutoGradedLabRunner } from "@/components/assessment/AutoGradedLabRunner";
import { PeerAssignmentWorkspace } from "@/components/assessment/PeerAssignmentWorkspace";

export default function AssessmentsPage() {
  const [activeAssessment, setActiveAssessment] = useState<"quiz" | "lab" | "peer">("quiz");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                TRACK B ASSESSMENTS
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Coursera Auto-Grader &amp; Peer Review Engine
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-slate-900 dark:text-white">
              Assessments &amp; Auto-Grader Sandbox
            </h1>
          </div>

          {/* Assessment Selector Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-300/60 dark:border-slate-800 shadow-inner">
            <button
              onClick={() => setActiveAssessment("quiz")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeAssessment === "quiz"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>📝</span> Graded Quiz (80% Pass)
            </button>
            <button
              onClick={() => setActiveAssessment("lab")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeAssessment === "lab"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>💻</span> Auto-Graded Lab
            </button>
            <button
              onClick={() => setActiveAssessment("peer")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeAssessment === "peer"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>👥</span> Peer Review &amp; Appeal
            </button>
          </div>
        </div>

        {/* Selected Assessment Runner Component */}
        <div className="transition-all duration-300">
          {activeAssessment === "quiz" && (
            <GradedQuizRunner itemId="item-ml-quiz-1" />
          )}
          {activeAssessment === "lab" && (
            <AutoGradedLabRunner itemId="item-ml-lab-1" />
          )}
          {activeAssessment === "peer" && (
            <PeerAssignmentWorkspace itemId="item-ml-peer-1" />
          )}
        </div>
      </main>
    </div>
  );
}
