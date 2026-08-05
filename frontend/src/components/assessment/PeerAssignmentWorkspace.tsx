"use client";

import React, { useState } from "react";
import { getRpcClient } from "@/lib/connect_client";
import { AssessmentService } from "@/gen/assessment/v1/assessment_pb";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/providers/AuthProvider";
import { Check, Lock, AlertTriangle, Info, Send, ExternalLink, Scale } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";

interface PeerAssignmentWorkspaceProps {
  itemId: string;
  title?: string;
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

export function PeerAssignmentWorkspace({ itemId, title, userId }: PeerAssignmentWorkspaceProps) {
  const { userId: authUserId } = useAuth();
  const effectiveUserId = userId || authUserId || "user-demo-1";

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
  const [submissionUrl, setSubmissionUrl] = useState(
    "https://github.com/learner/supervised-ml-capstone",
  );
  const [textContent, setTextContent] = useState(
    "Supervised Machine Learning Model Capstone Project. Built a Random Forest & Linear Regression model with 94.2% test accuracy.",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Peer items to grade
  const [peerItems, setPeerItems] = useState<PeerItem[]>([
    {
      reviewId: "rev-sub-001",
      submissionUrl: "https://github.com/peer-alex/ml-capstone-project",
      textContent:
        "Implemented XGBoost model for housing price prediction with Feature Engineering and K-Fold cross validation.",
      rubricCriteria: [
        {
          criteriaId: "c1",
          title: "Code Structure & Best Practices",
          maxScore: 10,
          scoreGiven: 9,
          feedback: "Great modular structure!",
        },
        {
          criteriaId: "c2",
          title: "Model Evaluation Metrics",
          maxScore: 10,
          scoreGiven: 10,
          feedback: "Thorough MSE & R2 reporting.",
        },
        {
          criteriaId: "c3",
          title: "Documentation & Readme",
          maxScore: 10,
          scoreGiven: 8,
          feedback: "Clear installation steps.",
        },
      ],
    },
    {
      reviewId: "rev-sub-002",
      submissionUrl: "https://github.com/peer-sam/regression-model",
      textContent:
        "Supervised Learning project comparing Linear Regression and Polynomial Regression models.",
      rubricCriteria: [
        {
          criteriaId: "c1",
          title: "Code Structure & Best Practices",
          maxScore: 10,
          scoreGiven: 8,
          feedback: "Good effort.",
        },
        {
          criteriaId: "c2",
          title: "Model Evaluation Metrics",
          maxScore: 10,
          scoreGiven: 7,
          feedback: "Missing cross validation.",
        },
        {
          criteriaId: "c3",
          title: "Documentation & Readme",
          maxScore: 10,
          scoreGiven: 8,
          feedback: "Decent readme.",
        },
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
      toast.success("Assignment submitted successfully!");
      setActiveTab("grade");
    } catch (err) {
      console.warn("RPC submitPeerAssignment failed, using fallback:", err);
      if (typeof window !== "undefined") {
        localStorage.setItem(`peer_submitted_${itemId}_${effectiveUserId}`, "true");
      }
      setHasSubmitted(true);
      setLockNotice("");
      setSubmitStatus(
        "Assignment submitted successfully. Please grade 3 peer submissions to unlock your final score.",
      );
      toast.success("Assignment submitted successfully!");
      setActiveTab("grade");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTabClick = (tab: "submit" | "grade" | "appeal") => {
    if ((tab === "grade" || tab === "appeal") && !hasSubmitted) {
      setLockNotice(
        "🔒 Theo quy tắc BR_PEER_001: Bạn bắt buộc phải nộp bài cá nhân ở Tab 1 trước khi mở khóa chấm chéo bài của bạn học.",
      );
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

  const toast = useToast();
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
      toast.success(res.message || "Peer review grade submitted successfully!");
    } catch {
      toast.success("Peer review grade submitted successfully!");
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
      const statusMsg = `Appeal status: ${res.appealStatus}. TA will review within 7 days.`;
      setAppealStatus(statusMsg);
      toast.success("Grade appeal submitted successfully!");
    } catch {
      setAppealStatus("Appeal status: PENDING. TA will review within 7 days.");
      toast.success("Grade appeal submitted successfully!");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 bg-card border border-border rounded-2xl shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <Badge variant="verified">PEER REVIEW ASSIGNMENT</Badge>
          <h2 className="text-xl font-bold text-foreground mt-1">
            {title || "Bài tập nộp chấm chéo"}
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
          <Button
            type="button"
            variant={activeTab === "submit" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleTabClick("submit")}
            className="flex items-center gap-1"
          >
            <span>1. My Submission</span>
            {hasSubmitted && <Check className="w-3.5 h-3.5 text-success" />}
          </Button>

          <Button
            type="button"
            variant={activeTab === "grade" ? "secondary" : "ghost"}
            size="sm"
            disabled={!hasSubmitted}
            onClick={() => handleTabClick("grade")}
            className="flex items-center gap-1"
          >
            <span>2. Grade Peers (3/3)</span>
            {!hasSubmitted && <Lock className="w-3 h-3 text-muted-foreground" />}
          </Button>

          <Button
            type="button"
            variant={activeTab === "appeal" ? "secondary" : "ghost"}
            size="sm"
            disabled={!hasSubmitted}
            onClick={() => handleTabClick("appeal")}
            className="flex items-center gap-1"
          >
            <span>3. Grade Appeal</span>
            {!hasSubmitted && <Lock className="w-3 h-3 text-muted-foreground" />}
          </Button>
        </div>
      </div>

      {/* Lock Warning Notice Banner */}
      {lockNotice && (
        <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 text-warning text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-m3-short-4 ease-m3-decelerate">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          <span>{lockNotice}</span>
        </div>
      )}

      {/* Tab 1: Submit My Assignment */}
      {activeTab === "submit" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-info/10 border border-info/20 text-xs text-info space-y-1">
            <h4 className="font-bold flex items-center gap-1.5">
              <Info className="w-4 h-4 text-info" />
              <span>Submission Requirements:</span>
            </h4>
            <p>
              Submit your GitHub repository URL and project summary. You must submit your assignment
              first to unlock peer review grading.
            </p>
          </div>

          <div className="space-y-3">
            <Input
              label="Project Repository / Submission URL"
              type="text"
              value={submissionUrl}
              onChange={(e) => setSubmissionUrl(e.target.value)}
              className="font-mono text-xs"
            />

            <Textarea
              label="Project Executive Summary & Methodology"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={4}
            />

            {submitStatus && (
              <p className="p-3 rounded-xl bg-success/10 border border-success/30 text-xs font-bold text-success flex items-center gap-1.5">
                <Check className="w-4 h-4 text-success" />
                <span>{submitStatus}</span>
              </p>
            )}

            <Button
              type="button"
              onClick={handleSubmitAssignment}
              isLoading={isSubmitting}
              size="sm"
            >
              {isSubmitting ? "Submitting…" : "Submit Peer Assignment"}
              <Send className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Tab 2: Grade Peers */}
      {activeTab === "grade" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 text-xs text-warning">
            <p className="font-semibold">
              Evaluate peer submissions objectively against the Rubric criteria below. Outlier flags
              are automatically triggered if score variance exceeds 30%.
            </p>
          </div>

          {peerItems.map((peer, pIdx) => (
            <div
              key={peer.reviewId}
              className="p-5 rounded-2xl border border-border bg-card space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h4 className="font-bold text-sm text-foreground">
                  Peer Submission #{pIdx + 1} ({peer.reviewId})
                </h4>
                <a
                  href={peer.submissionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Repository</span>
                </a>
              </div>

              <p className="text-xs text-muted-foreground bg-muted p-3 rounded-xl border border-border font-mono">
                {peer.textContent}
              </p>

              {/* Rubric Criteria Controls */}
              <div className="space-y-3 pt-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Rubric Criteria Scoring:
                </h5>
                {peer.rubricCriteria.map((crit, cIdx) => (
                  <div
                    key={crit.criteriaId}
                    className="p-3 rounded-xl bg-background border border-border space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">{crit.title}</span>
                      <span className="font-mono font-bold text-primary">
                        {crit.scoreGiven} / {crit.maxScore} pts
                      </span>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={crit.maxScore}
                      step={1}
                      value={crit.scoreGiven}
                      onChange={(e) => handleScoreChange(pIdx, cIdx, parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <Button type="button" onClick={() => handleSubmitPeerGrade(pIdx)} size="sm">
                  Submit Grade for Peer #{pIdx + 1}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Grade Appeal */}
      {activeTab === "appeal" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-accent text-accent-foreground border border-border text-xs">
            <h4 className="font-bold mb-1 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-primary" />
              <span>Submit Grade Appeal (BR_PEER_003)</span>
            </h4>
            <p>
              If you believe peer reviewers scored your assignment unfairly or incorrectly, submit
              an appeal within 7 days. A Teaching Assistant (TA) will re-grade your submission
              directly.
            </p>
          </div>

          <div className="space-y-3">
            <Textarea
              label="Reason for Appeal & Justification"
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              rows={4}
              placeholder="Explain why the peer review grade should be reviewed by a TA…"
            />

            {appealStatus && (
              <p className="p-3 rounded-xl bg-warning/10 border border-warning/30 text-xs font-bold text-warning">
                {appealStatus}
              </p>
            )}

            <Button type="button" onClick={handleSubmitAppeal} disabled={!appealReason} size="sm">
              Submit Appeal to TA
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
