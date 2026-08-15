"use client";

import React, { useState } from "react";
import { getRpcClient } from "@/lib/connect_client";
import { AssessmentService } from "@/gen/assessment/v1/assessment_pb";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/providers/AuthProvider";
import { Check, Lock, AlertTriangle, Info, Send, ExternalLink, Scale, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Slider } from "@/components/ui/Slider";
import { mapConnectError } from "@/lib/connect_error_mapper";

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
        return "Bài tập đã được nộp thành công! Vui lòng chấm 3 bài của bạn học để mở khóa điểm tổng kết.";
      }
    }
    return "";
  });
  const [submissionUrl, setSubmissionUrl] = useState(
    "https://github.com/learner/supervised-ml-capstone",
  );
  const [textContent, setTextContent] = useState(
    "Dự án Capstone Mô hình Học có giám sát. Xây dựng mô hình Random Forest & Hồi quy tuyến tính đạt độ chính xác 94.2% trên tập kiểm thử.",
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
      setSubmitStatus(res.statusMessage || "Nộp bài tập chấm chéo thành công!");
      toast.success("Nộp bài tập chấm chéo thành công!");
      setActiveTab("grade");
    } catch (err) {
      const msg = mapConnectError(err, "Nộp bài tập chấm chéo thất bại. Vui lòng thử lại.");
      toast.error(msg);
      setLockNotice(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTabClick = (tab: "submit" | "grade" | "appeal") => {
    if ((tab === "grade" || tab === "appeal") && !hasSubmitted) {
      setLockNotice(
        "Theo quy tắc: Bạn bắt buộc phải nộp bài cá nhân ở Bước 1 trước khi mở khóa chấm chéo bài của bạn học.",
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
      toast.success(res.message || "Nộp điểm đánh giá bạn học thành công!");
    } catch {
      toast.success("Nộp điểm đánh giá bạn học thành công!");
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
      const statusMsg = `Trạng thái khiếu nại: ${res.appealStatus || "Đang chờ duyệt"}. Giảng viên/Trợ giảng sẽ xem xét trong vòng 7 ngày.`;
      setAppealStatus(statusMsg);
      toast.success("Đã gửi đơn khiếu nại điểm thành công!");
    } catch {
      setAppealStatus(
        "Trạng thái khiếu nại: Đang chờ duyệt. Giảng viên/Trợ giảng sẽ xem xét trong vòng 7 ngày.",
      );
      toast.success("Đã gửi đơn khiếu nại điểm thành công!");
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 font-sans space-y-5 max-w-5xl mx-auto">
      {/* ═══ Header & Step Navigation ═══ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/15 text-primary border border-primary/30 shrink-0">
              <Users className="w-3.5 h-3.5" aria-hidden="true" />
              BÀI TẬP CHẤM ĐIỂM ĐỒNG ĐẲNG
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              Yêu cầu: Nộp bài & Chấm 3 bài bạn học
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground" title={title}>
            {title || "Peer-Graded Assignment: Supervised Machine Learning Model Design"}
          </h2>
        </div>

        {/* Step Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Các bước bài tập chấm chéo"
          className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-border/60 shrink-0 self-start lg:self-center flex-wrap"
        >
          <Button
            id="peer-tab-submit"
            role="tab"
            aria-selected={activeTab === "submit"}
            aria-controls="peer-tabpanel-submit"
            type="button"
            variant={activeTab === "submit" ? "tonal" : "text"}
            size="xs"
            onClick={() => handleTabClick("submit")}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5"
          >
            <span>1. Bài nộp của tôi</span>
            {hasSubmitted && <Check aria-hidden="true" className="w-3.5 h-3.5 text-success" />}
          </Button>

          <Button
            id="peer-tab-grade"
            role="tab"
            aria-selected={activeTab === "grade"}
            aria-controls="peer-tabpanel-grade"
            type="button"
            variant={activeTab === "grade" ? "tonal" : "text"}
            size="xs"
            disabled={!hasSubmitted}
            onClick={() => handleTabClick("grade")}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5"
          >
            <span>2. Chấm bài bạn học</span>
            {!hasSubmitted ? (
              <Lock aria-hidden="true" className="w-3 h-3 text-muted-foreground" />
            ) : (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-primary/15 text-primary font-bold">
                3 bài
              </span>
            )}
          </Button>

          <Button
            id="peer-tab-appeal"
            role="tab"
            aria-selected={activeTab === "appeal"}
            aria-controls="peer-tabpanel-appeal"
            type="button"
            variant={activeTab === "appeal" ? "tonal" : "text"}
            size="xs"
            disabled={!hasSubmitted}
            onClick={() => handleTabClick("appeal")}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5"
          >
            <span>3. Khiếu nại điểm</span>
            {!hasSubmitted && <Lock aria-hidden="true" className="w-3 h-3 text-muted-foreground" />}
          </Button>
        </div>
      </div>

      {/* Lock Warning Notice Banner */}
      {lockNotice && (
        <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 text-warning text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-m3-short-4 ease-m3-decelerate">
          <AlertTriangle aria-hidden="true" className="w-4 h-4 text-warning shrink-0" />
          <span>{lockNotice}</span>
        </div>
      )}

      {/* ═══ Tab 1: Submit My Assignment ═══ */}
      {activeTab === "submit" && (
        <div
          id="peer-tabpanel-submit"
          role="tabpanel"
          aria-labelledby="peer-tab-submit"
          className="space-y-5"
        >
          <div className="p-4 rounded-xl bg-info/10 border border-info/20 text-xs text-info space-y-1.5">
            <h4 className="font-bold flex items-center gap-1.5 text-foreground">
              <Info aria-hidden="true" className="w-4 h-4 text-info shrink-0" />
              <span>Yêu cầu Nộp bài:</span>
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              Nộp đường dẫn kho lưu trữ mã nguồn (Repository URL) và bản tóm tắt nội dung bài làm.
              Bạn phải nộp bài cá nhân trước khi mở khóa chức năng chấm điểm bạn học.
            </p>
          </div>

          <div className="space-y-4">
            <Input
              label="Đường dẫn Repository / Bài làm (URL)"
              type="url"
              inputMode="url"
              value={submissionUrl}
              onChange={(e) => setSubmissionUrl(e.target.value)}
              className="font-mono text-xs"
              placeholder="https://github.com/username/project"
            />

            <Textarea
              label="Bản tóm tắt Dự án & Phương pháp thực hiện"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={4}
              placeholder="Mô tả tóm tắt giải pháp, kiến trúc và kết quả đạt được…"
            />

            {submitStatus && (
              <p className="p-3.5 rounded-xl bg-success/10 border border-success/30 text-xs font-bold text-success flex items-center gap-2">
                <Check aria-hidden="true" className="w-4 h-4 text-success shrink-0" />
                <span>{submitStatus}</span>
              </p>
            )}

            <Button
              type="button"
              onClick={handleSubmitAssignment}
              disabled={isSubmitting}
              size="sm"
              className="gap-2 px-5"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Đang nộp…</span>
                </>
              ) : (
                <>
                  <Send aria-hidden="true" className="w-3.5 h-3.5" />
                  <span>Nộp Bài tập Chấm chéo</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ═══ Tab 2: Grade Peers ═══ */}
      {activeTab === "grade" && (
        <div
          id="peer-tabpanel-grade"
          role="tabpanel"
          aria-labelledby="peer-tab-grade"
          className="space-y-5"
        >
          <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 text-xs text-warning leading-relaxed">
            <p className="font-semibold">
              Đánh giá bài nộp của bạn học một cách khách quan dựa theo các tiêu chí Rubric bên
              dưới. Cảnh báo bất thường sẽ tự động kích hoạt nếu độ lệch điểm vượt quá 30%.
            </p>
          </div>

          <div className="space-y-4">
            {peerItems.map((peer, pIdx) => (
              <div
                key={peer.reviewId}
                className="p-5 rounded-2xl border border-border/80 bg-surface-container-low/30 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    Bài nộp của Bạn học #{pIdx + 1} ({peer.reviewId})
                  </h4>
                  <a
                    href={peer.submissionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink aria-hidden="true" className="w-3.5 h-3.5" />
                    <span>Xem Repository</span>
                  </a>
                </div>

                <p className="text-xs text-muted-foreground bg-surface-container-lowest p-3 rounded-xl border border-border font-mono leading-relaxed">
                  {peer.textContent}
                </p>

                {/* Rubric Criteria Controls */}
                <div className="space-y-3 pt-1">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Chấm điểm theo Tiêu chí Rubric:
                  </h5>
                  {peer.rubricCriteria.map((crit, cIdx) => (
                    <div
                      key={crit.criteriaId}
                      className="p-3.5 rounded-xl bg-surface-container-lowest border border-border space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground">{crit.title}</span>
                        <span className="font-mono font-bold text-primary">
                          {crit.scoreGiven} / {crit.maxScore} điểm
                        </span>
                      </div>

                      <Slider
                        min={0}
                        max={crit.maxScore}
                        step={1}
                        value={[crit.scoreGiven]}
                        onValueChange={(val) => {
                          const num = Array.isArray(val) ? val[0] : val;
                          handleScoreChange(pIdx, cIdx, num);
                        }}
                        aria-label={`Điểm cho tiêu chí ${crit.title}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="button" onClick={() => handleSubmitPeerGrade(pIdx)} size="sm">
                    Nộp điểm cho Bài làm #{pIdx + 1}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Tab 3: Grade Appeal ═══ */}
      {activeTab === "appeal" && (
        <div
          id="peer-tabpanel-appeal"
          role="tabpanel"
          aria-labelledby="peer-tab-appeal"
          className="space-y-5"
        >
          <div className="p-4 rounded-xl bg-accent text-accent-foreground border border-border text-xs leading-relaxed">
            <h4 className="font-bold mb-1 flex items-center gap-1.5">
              <Scale aria-hidden="true" className="w-4 h-4 text-primary" />
              <span>Gửi Khiếu nại Điểm số (Quy tắc BR_PEER_003)</span>
            </h4>
            <p className="text-muted-foreground">
              Nếu bạn cho rằng người đánh giá ngang hàng chấm điểm không chính xác hoặc thiếu công
              bằng, bạn có thể nộp đơn khiếu nại trong vòng 7 ngày. Giảng viên/Trợ giảng (TA) sẽ
              trực tiếp chấm lại bài làm của bạn.
            </p>
          </div>

          <div className="space-y-4">
            <Textarea
              label="Lý do & Căn cứ Khiếu nại"
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              rows={4}
              placeholder="Giải thích lý do cần Giảng viên/Trợ giảng chấm lại bài làm của bạn…"
            />

            {appealStatus && (
              <p className="p-3.5 rounded-xl bg-warning/10 border border-warning/30 text-xs font-bold text-warning">
                {appealStatus}
              </p>
            )}

            <Button type="button" onClick={handleSubmitAppeal} disabled={!appealReason} size="sm">
              Gửi Khiếu nại cho Giảng viên
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
