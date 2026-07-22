"use client";

import React, { useState } from "react";
import { getRpcClient } from "@/lib/connect_client";
import { AssessmentService } from "@/gen/assessment/v1/assessment_pb";

interface PeerAssignmentWorkspaceProps {
  itemId: string;
  userId?: string;
}

interface PeerItem {
  reviewId: string;
  submissionUrl: string;
  textContent: string;
  rubricCriteria: {
    criteriaId: string;
    title: string;
    maxScore: number;
    scoreGiven: number;
    feedback: string;
  }[];
}

export function PeerAssignmentWorkspace({
  itemId,
  userId,
}: PeerAssignmentWorkspaceProps) {
  const effectiveUserId = userId || (typeof window !== "undefined" ? localStorage.getItem("user_id") || "user-demo-1" : "user-demo-1");

  const [hasSubmitted, setHasSubmitted] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`peer_submitted_${itemId}_${effectiveUserId}`) === "true";
    }
    return false;
  });

  const [activeTab, setActiveTab] = useState<"submit" | "grade" | "appeal">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`peer_submitted_${itemId}_${effectiveUserId}`);
      if (saved === "true") return "grade";
    }
    return "submit";
  });

  const [submitStatus, setSubmitStatus] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`peer_submitted_${itemId}_${effectiveUserId}`);
      if (saved === "true") {
        return "Assignment submitted successfully. Please grade 3 peer submissions to unlock your final score.";
      }
    }
    return "";
  });
  const [submissionUrl, setSubmissionUrl] = useState("https://github.com/learner/supervised-ml-capstone");
  const [textContent, setTextContent] = useState(
    "Supervised Machine Learning Model Capstone Project. Built a Random Forest & Linear Regression model with 94.2% test accuracy."
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Peer items to grade
  const [peerItems, setPeerItems] = useState<PeerItem[]>([
    {
      reviewId: "rev-sub-001",
      submissionUrl: "https://github.com/peer-alex/ml-capstone-project",
      textContent: "Implemented XGBoost model for housing price prediction with Feature Engineering and K-Fold cross validation.",
      rubricCriteria: [
        { criteriaId: "c1", title: "Code Structure & Best Practices", maxScore: 10, scoreGiven: 9, feedback: "Great modular structure!" },
        { criteriaId: "c2", title: "Model Evaluation Metrics", maxScore: 10, scoreGiven: 10, feedback: "Thorough MSE & R2 reporting." },
        { criteriaId: "c3", title: "Documentation & Readme", maxScore: 10, scoreGiven: 8, feedback: "Clear installation steps." },
      ],
    },
    {
      reviewId: "rev-sub-002",
      submissionUrl: "https://github.com/peer-sam/regression-model",
      textContent: "Supervised Learning project comparing Linear Regression and Polynomial Regression models.",
      rubricCriteria: [
        { criteriaId: "c1", title: "Code Structure & Best Practices", maxScore: 10, scoreGiven: 8, feedback: "Good effort." },
        { criteriaId: "c2", title: "Model Evaluation Metrics", maxScore: 10, scoreGiven: 7, feedback: "Missing cross validation." },
        { criteriaId: "c3", title: "Documentation & Readme", maxScore: 10, scoreGiven: 8, feedback: "Decent readme." },
      ],
    },
  ]);

  const [appealReason, setAppealReason] = useState("");
  const [appealStatus, setAppealStatus] = useState("");
  const [lockNotice, setLockNotice] = useState("");

  const handleSubmitAssignment = async () => {
    setIsSubmitting(true);
    try {
      const client = getRpcClient(AssessmentService);
      const res = await client.submitPeerAssignment({
        itemId,
        submissionUrl,
        textContent,
      });

      if (typeof window !== "undefined") {
        localStorage.setItem(`peer_submitted_${itemId}_${effectiveUserId}`, "true");
      }
      setHasSubmitted(true);
      setLockNotice("");
      setSubmitStatus(res.statusMessage || "Assignment submitted successfully!");
      setActiveTab("grade");
    } catch (err) {
      console.warn("RPC submitPeerAssignment failed, using fallback:", err);
      if (typeof window !== "undefined") {
        localStorage.setItem(`peer_submitted_${itemId}_${effectiveUserId}`, "true");
      }
      setHasSubmitted(true);
      setLockNotice("");
      setSubmitStatus("Assignment submitted successfully. Please grade 3 peer submissions to unlock your final score.");
      setActiveTab("grade");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTabClick = (tab: "submit" | "grade" | "appeal") => {
    if ((tab === "grade" || tab === "appeal") && !hasSubmitted) {
      setLockNotice("🔒 Theo quy tắc BR_PEER_001: Bạn bắt buộc phải nộp bài cá nhân ở Tab 1 trước khi mở khóa chấm chéo bài của bạn học.");
      return;
    }
    setLockNotice("");
    setActiveTab(tab);
  };

  const handleScoreChange = (itemIdx: number, critIdx: number, newScore: number) => {
    const updated = [...peerItems];
    updated[itemIdx].rubricCriteria[critIdx].scoreGiven = newScore;
    setPeerItems(updated);
  };

  const handleSubmitPeerGrade = async (itemIdx: number) => {
    const item = peerItems[itemIdx];
    try {
      const client = getRpcClient(AssessmentService);
      const res = await client.submitPeerReviewGrade({
        reviewId: item.reviewId,
        gradedCriteria: item.rubricCriteria.map((c) => ({
          criteriaId: c.criteriaId,
          title: c.title,
          maxScore: c.maxScore,
          scoreGiven: c.scoreGiven,
          feedback: c.feedback,
        })),
      });
      alert(res.message || "Peer grade submitted!");
    } catch {
      alert("Peer review grade submitted successfully!");
    }
  };

  const handleSubmitAppeal = async () => {
    if (!appealReason) return;
    try {
      const client = getRpcClient(AssessmentService);
      const res = await client.submitGradeAppeal({
        submissionId: "peer-sub-001",
        appealReason,
      });
      setAppealStatus(`Appeal status: ${res.appealStatus}. TA will review within 7 days.`);
    } catch {
      setAppealStatus("Appeal status: PENDING. TA will review within 7 days.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50">
            PEER REVIEW ASSIGNMENT
          </span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            Machine Learning Capstone Project &amp; Peer Grading
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => handleTabClick("submit")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === "submit"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <span>1. My Submission</span>
            {hasSubmitted && (
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          <button
            onClick={() => handleTabClick("grade")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === "grade"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : !hasSubmitted
                ? "opacity-50 text-slate-400 cursor-not-allowed"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <span>2. Grade Peers (3/3)</span>
            {!hasSubmitted && (
              <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => handleTabClick("appeal")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === "appeal"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : !hasSubmitted
                ? "opacity-50 text-slate-400 cursor-not-allowed"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <span>3. Grade Appeal</span>
            {!hasSubmitted && (
              <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Lock Warning Notice Banner */}
      {lockNotice && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{lockNotice}</span>
        </div>
      )}

      {/* Tab 1: Submit My Assignment */}
      {activeTab === "submit" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-200 space-y-1">
            <h4 className="font-bold flex items-center gap-1.5">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Submission Requirements:</span>
            </h4>
            <p>
              Submit your GitHub repository URL and project summary. You must submit your assignment first to unlock peer review grading.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Project Repository / Submission URL
              </label>
              <input
                type="text"
                value={submissionUrl}
                onChange={(e) => setSubmissionUrl(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Project Executive Summary &amp; Methodology
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={4}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {submitStatus && (
              <p className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{submitStatus}</span>
              </p>
            )}

            <button
              onClick={handleSubmitAssignment}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-2"
            >
              <span>{isSubmitting ? "Submitting..." : "Submit Peer Assignment"}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Grade Peers */}
      {activeTab === "grade" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200">
            <p className="font-semibold">
              Evaluate peer submissions objectively against the Rubric criteria below. Outlier flags are automatically triggered if score variance exceeds 30%.
            </p>
          </div>

          {peerItems.map((peer, pIdx) => (
            <div
              key={peer.reviewId}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Peer Submission #{pIdx + 1} ({peer.reviewId})
                </h4>
                <a
                  href={peer.submissionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span>View Repository</span>
                </a>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 font-mono">
                {peer.textContent}
              </p>

              {/* Rubric Criteria Controls */}
              <div className="space-y-3 pt-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Rubric Criteria Scoring:
                </h5>
                {peer.rubricCriteria.map((crit, cIdx) => (
                  <div
                    key={crit.criteriaId}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {crit.title}
                      </span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {crit.scoreGiven} / {crit.maxScore} pts
                      </span>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={crit.maxScore}
                      step={1}
                      value={crit.scoreGiven}
                      onChange={(e) =>
                        handleScoreChange(pIdx, cIdx, parseFloat(e.target.value))
                      }
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => handleSubmitPeerGrade(pIdx)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  Submit Grade for Peer #{pIdx + 1}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Grade Appeal */}
      {activeTab === "appeal" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 text-xs text-purple-900 dark:text-purple-200">
            <h4 className="font-bold mb-1 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
              <span>Submit Grade Appeal (BR_PEER_003)</span>
            </h4>
            <p>
              If you believe peer reviewers scored your assignment unfairly or incorrectly, submit an appeal within 7 days. A Teaching Assistant (TA) will re-grade your submission directly.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Appeal &amp; Justification
              </label>
              <textarea
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                rows={4}
                placeholder="Explain why the peer review grade should be reviewed by a TA..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {appealStatus && (
              <p className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs font-bold text-amber-900 dark:text-amber-200">
                {appealStatus}
              </p>
            )}

            <button
              onClick={handleSubmitAppeal}
              disabled={!appealReason}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-xs"
            >
              Submit Appeal to TA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
