"use client";

import React, { useCallback, useEffect, useState } from "react";
import { getRpcClient } from "@/lib/connect_client";
import { AssessmentService } from "@/gen/assessment/v1/assessment_pb";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  Check,
  Lock,
  AlertTriangle,
  Info,
  Send,
  ExternalLink,
  Scale,
  Users,
  Loader2,
  BookOpen,
  FileText,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Slider } from "@/components/ui/Slider";
import { mapConnectError } from "@/lib/connect_error_mapper";
import { renderMarkdown } from "@/components/ai/AIChatMarkdownRenderer";
import { getSafeExternalUrl } from "@/lib/utils";

interface PeerAssignmentWorkspaceProps {
  itemId: string;
  title?: string;
  userId?: string;
  instructionsMarkdown?: string;
  rubricCriteriaJson?: string;
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
    description?: string;
  }[];
}

interface RubricPreviewItem {
  criteriaId: string;
  title: string;
  maxScore: number;
  description: string;
}

export function PeerAssignmentWorkspace({
  itemId,
  title,
  userId,
  instructionsMarkdown,
  rubricCriteriaJson,
}: PeerAssignmentWorkspaceProps) {
  const toast = useToast();
  const { userId: authUserId } = useAuth();
  const effectiveUserId = userId || authUserId || "user-demo-1";

  const [hasSubmitted, setHasSubmitted] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`peer_submitted_${itemId}_${effectiveUserId}`) === "true";
    }
    return false;
  });

  const [userSubmissionId, setUserSubmissionId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`peer_submission_id_${itemId}_${effectiveUserId}`) || "";
    }
    return "";
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
        return "Bài tập đã được nộp thành công! Vui lòng chấm bài của bạn học để mở khóa điểm tổng kết.";
      }
    }
    return "";
  });

  const [submissionUrl, setSubmissionUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Peer items to grade - initialized as empty array (no mock dead-code)
  const [peerItems, setPeerItems] = useState<PeerItem[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  // Parse reference rubric criteria from prop if provided
  const referenceRubrics: RubricPreviewItem[] = React.useMemo(() => {
    if (!rubricCriteriaJson || !rubricCriteriaJson.trim()) return [];
    try {
      let parsed = JSON.parse(rubricCriteriaJson);
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      if (Array.isArray(parsed)) {
        return parsed.map((item, idx) => ({
          criteriaId: String(item.criteria_id || item.criteriaId || item.id || `c${idx + 1}`),
          title: String(item.title || ""),
          maxScore: Number(item.max_score || item.maxScore || 10),
          description: String(item.description || ""),
        }));
      }
    } catch {
      // ignore parse error
    }
    return [];
  }, [rubricCriteriaJson]);

  const fetchReviews = useCallback(async () => {
    setIsLoadingReviews(true);
    try {
      const client = getRpcClient(AssessmentService);
      const res = await client.getPeerReviewsToGrade({ itemId });
      if (res.itemsToGrade && res.itemsToGrade.length > 0) {
        setPeerItems(
          res.itemsToGrade.map((item) => ({
            reviewId: item.reviewId,
            submissionUrl: item.submissionUrl,
            textContent: item.textContent,
            rubricCriteria: item.rubricCriteria.map((c) => ({
              criteriaId: c.criteriaId,
              title: c.title,
              maxScore: c.maxScore || 10,
              scoreGiven: c.scoreGiven || 0,
              feedback: c.feedback || "",
              description: c.description || "",
            })),
          })),
        );
      } else {
        setPeerItems([]);
      }
    } catch {
      setPeerItems([]);
    } finally {
      setIsLoadingReviews(false);
    }
  }, [itemId]);

  useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  const [appealReason, setAppealReason] = useState("");
  const [appealStatus, setAppealStatus] = useState("");
  const [lockNotice, setLockNotice] = useState("");
  const [isSubmittingGrade, setIsSubmittingGrade] = useState<Record<number, boolean>>({});
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);

  const handleSubmitAssignment = async () => {
    if (!submissionUrl.trim() && !textContent.trim()) {
      toast.error("Vui lòng cung cấp liên kết bài làm hoặc nội dung bài luận tóm tắt.");
      return;
    }
    setIsSubmitting(true);
    try {
      const client = getRpcClient(AssessmentService);
      const res = await client.submitPeerAssignment({
        itemId,
        submissionUrl: submissionUrl.trim(),
        textContent: textContent.trim(),
      });

      if (typeof window !== "undefined") {
        localStorage.setItem(`peer_submitted_${itemId}_${effectiveUserId}`, "true");
        if (res.submissionId) {
          localStorage.setItem(`peer_submission_id_${itemId}_${effectiveUserId}`, res.submissionId);
        }
      }
      if (res.submissionId) {
        setUserSubmissionId(res.submissionId);
      }
      setHasSubmitted(true);
      setLockNotice("");
      setSubmitStatus(res.statusMessage || "Nộp bài tập chấm chéo thành công!");
      toast.success("Nộp bài tập chấm chéo thành công!");
      setActiveTab("grade");
      // Immediately reload peer reviews queue
      void fetchReviews();
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
    setPeerItems((prev) =>
      prev.map((peer, pIdx) =>
        pIdx !== itemIdx
          ? peer
          : {
              ...peer,
              rubricCriteria: peer.rubricCriteria.map((c, cIdx) =>
                cIdx !== critIdx ? c : { ...c, scoreGiven: newScore },
              ),
            },
      ),
    );
  };

  const handleFeedbackChange = (itemIdx: number, critIdx: number, feedback: string) => {
    setPeerItems((prev) =>
      prev.map((peer, pIdx) =>
        pIdx !== itemIdx
          ? peer
          : {
              ...peer,
              rubricCriteria: peer.rubricCriteria.map((c, cIdx) =>
                cIdx !== critIdx ? c : { ...c, feedback },
              ),
            },
      ),
    );
  };

  const handleSubmitPeerGrade = async (itemIdx: number) => {
    const item = peerItems[itemIdx];
    setIsSubmittingGrade((prev) => ({ ...prev, [itemIdx]: true }));
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
          description: c.description || "",
        })),
      });
      toast.success(res.message || "Nộp điểm đánh giá bạn học thành công!");
    } catch (err) {
      const msg = mapConnectError(err, "Nộp điểm đánh giá bạn học thất bại. Vui lòng thử lại.");
      toast.error(msg);
    } finally {
      setIsSubmittingGrade((prev) => ({ ...prev, [itemIdx]: false }));
    }
  };

  const handleSubmitAppeal = async () => {
    if (!appealReason.trim()) {
      toast.error("Vui lòng nhập lý do khiếu nại điểm chi tiết.");
      return;
    }
    const targetSubmissionId = userSubmissionId || `peer-${itemId}`;
    setIsSubmittingAppeal(true);
    try {
      const client = getRpcClient(AssessmentService);
      const res = await client.submitGradeAppeal({
        submissionId: targetSubmissionId,
        appealReason: appealReason.trim(),
      });
      const statusMsg = `Trạng thái khiếu nại: ${res.appealStatus || "Đang chờ duyệt"}. Giảng viên/Trợ giảng sẽ xem xét trong vòng 7 ngày.`;
      setAppealStatus(statusMsg);
      toast.success("Đã gửi đơn khiếu nại điểm thành công!");
    } catch (err) {
      const msg = mapConnectError(
        err,
        "Gửi đơn khiếu nại điểm thất bại. Vui lòng kiểm tra lại điều kiện nộp đơn.",
      );
      toast.error(msg);
      setAppealStatus(msg);
    } finally {
      setIsSubmittingAppeal(false);
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
              Yêu cầu: Nộp bài & Chấm {peerItems.length > 0 ? `${peerItems.length} bài` : "bài"} bạn
              học
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground" title={title}>
            {title || "Bài tập Đánh giá Ngang hàng (Peer-Graded Assignment)"}
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
                {peerItems.length} bài
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
          {/* Assignment Instructions / Prompt */}
          {instructionsMarkdown && (
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-border space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span>Yêu cầu & Đề bài bài tập</span>
              </h4>
              <div className="text-xs text-foreground prose prose-sm dark:prose-invert max-w-none leading-relaxed">
                {renderMarkdown(instructionsMarkdown)}
              </div>
            </div>
          )}

          {/* Reference Rubric Preview */}
          {referenceRubrics.length > 0 && (
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-border space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span>Tiêu chí Đánh giá Tham khảo (Rubric)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {referenceRubrics.map((r, rIdx) => (
                  <div
                    key={r.criteriaId || rIdx}
                    className="p-3 rounded-xl bg-card border border-border/80 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-foreground">{r.title}</span>
                      <span className="text-primary font-mono">{r.maxScore}đ</span>
                    </div>
                    {r.description && (
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {r.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-info/10 border border-info/20 text-xs text-info space-y-1.5">
            <h4 className="font-bold flex items-center gap-1.5 text-foreground">
              <Info aria-hidden="true" className="w-4 h-4 text-info shrink-0" />
              <span>Hướng dẫn Nộp bài (Quy tắc BR_PEER_001):</span>
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              Bạn có thể nộp đường dẫn sản phẩm thực tế (Figma, Canva, Google Drive, Slide, Github,
              Website...) kết hợp bản tóm tắt giải pháp văn bản. Bạn bắt buộc phải nộp bài cá nhân
              trước khi mở khóa chức năng chấm điểm bạn học.
            </p>
          </div>

          <div className="space-y-4">
            <Input
              label="Đường dẫn Liên kết Bài làm / Sản phẩm (URL)"
              type="url"
              inputMode="url"
              value={submissionUrl}
              onChange={(e) => setSubmissionUrl(e.target.value)}
              className="font-mono text-xs"
              placeholder="https://figma.com/file/... hoặc https://github.com/username/project"
            />

            <Textarea
              label="Bản tóm tắt Dự án / Nội dung bài luận"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={5}
              placeholder="Mô tả tóm tắt giải pháp, phương pháp thực hiện và các kết quả chính đạt được…"
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
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  <span>Đang nộp…</span>
                </>
              ) : (
                <>
                  <Send aria-hidden="true" className="w-3.5 h-3.5" />
                  <span>
                    {hasSubmitted ? "Nộp lại Bài tập Chấm chéo" : "Nộp Bài tập Chấm chéo"}
                  </span>
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
              dưới. Cảnh báo bất thường sẽ tự động kích hoạt nếu độ lệch điểm giữa các bạn học vượt
              quá 30%.
            </p>
          </div>

          <div className="space-y-4">
            {isLoadingReviews ? (
              <div className="p-8 rounded-2xl border border-border bg-card text-center space-y-3">
                <span className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin inline-block" />
                <p className="text-xs text-muted-foreground font-semibold">
                  Đang tải danh sách bài bạn học cần chấm…
                </p>
              </div>
            ) : peerItems.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-border bg-card text-center space-y-3">
                <Users className="w-8 h-8 text-muted-foreground mx-auto" />
                <h4 className="font-bold text-sm text-foreground">
                  Chưa có bài nộp nào trong hàng chờ
                </h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Hệ thống chưa tìm thấy bài nộp nào khác trong hàng chờ chấm chéo của khóa học. Khi
                  có thêm bạn học nộp bài, hệ thống sẽ tự động phân bổ bài vào đây cho bạn chấm.
                </p>
                <Button
                  type="button"
                  variant="outlined"
                  size="xs"
                  onClick={() => void fetchReviews()}
                  className="mt-2"
                >
                  Làm mới hàng chờ
                </Button>
              </div>
            ) : (
              peerItems.map((peer, pIdx) => (
                <div
                  key={peer.reviewId}
                  className="p-5 rounded-2xl border border-border/80 bg-surface-container-low/30 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      Bài nộp của Bạn học #{pIdx + 1} ({peer.reviewId})
                    </h4>
                    {getSafeExternalUrl(peer.submissionUrl) ? (
                      <a
                        href={getSafeExternalUrl(peer.submissionUrl)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink aria-hidden="true" className="w-3.5 h-3.5" />
                        <span>Mở liên kết bài làm</span>
                      </a>
                    ) : peer.submissionUrl ? (
                      <span className="text-xs font-mono text-destructive">
                        Liên kết không an toàn
                      </span>
                    ) : null}
                  </div>

                  {peer.textContent && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Nội dung bài luận / Tóm tắt giải pháp:</span>
                      </div>
                      <p className="text-xs text-foreground bg-surface-container-lowest p-3.5 rounded-xl border border-border whitespace-pre-wrap leading-relaxed">
                        {peer.textContent}
                      </p>
                    </div>
                  )}

                  {/* Rubric Criteria Controls */}
                  <div className="space-y-3 pt-1">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Chấm điểm theo Tiêu chí Rubric:
                    </h5>
                    {peer.rubricCriteria.map((crit, cIdx) => (
                      <div
                        key={crit.criteriaId}
                        className="p-3.5 rounded-xl bg-surface-container-lowest border border-border space-y-2.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">{crit.title}</span>
                          <span className="font-mono font-bold text-primary">
                            {crit.scoreGiven} / {crit.maxScore} điểm
                          </span>
                        </div>

                        {crit.description && (
                          <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                            {crit.description}
                          </p>
                        )}

                        <Slider
                          min={0}
                          max={crit.maxScore}
                          step={0.5}
                          value={[crit.scoreGiven]}
                          onValueChange={(val) => {
                            const num = Array.isArray(val) ? (val[0] ?? 0) : Number(val);
                            handleScoreChange(pIdx, cIdx, num);
                          }}
                          aria-label={`Điểm cho tiêu chí ${crit.title}`}
                        />

                        <Input
                          placeholder="Nhận xét / Lời góp ý cho tiêu chí này (tùy chọn)..."
                          value={crit.feedback || ""}
                          onChange={(e) => handleFeedbackChange(pIdx, cIdx, e.target.value)}
                          className="text-xs"
                          aria-label={`Nhận xét tiêu chí ${crit.title}`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      onClick={() => handleSubmitPeerGrade(pIdx)}
                      disabled={isSubmittingGrade[pIdx]}
                      size="sm"
                    >
                      {isSubmittingGrade[pIdx]
                        ? "Đang gửi điểm…"
                        : `Nộp điểm cho Bài làm #${pIdx + 1}`}
                    </Button>
                  </div>
                </div>
              ))
            )}
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
              <span>Gửi Khiếu nại Điểm số (Quy tắc BR_PEER_003 & BR_PEER_007)</span>
            </h4>
            <p className="text-muted-foreground">
              Nếu bạn cho rằng người đánh giá ngang hàng chấm điểm không chính xác hoặc thiếu công
              bằng, bạn có thể nộp đơn khiếu nại trong vòng 7 ngày kể từ khi điểm được công bố.
              Giảng viên / Trợ giảng (TA) sẽ trực tiếp rà soát và chấm lại bài làm của bạn.
            </p>
          </div>

          <div className="space-y-4">
            <Textarea
              label="Lý do & Căn cứ Khiếu nại"
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              rows={4}
              placeholder="Giải thích rõ các điểm số chưa công bằng hoặc sai lệch để Giảng viên/Trợ giảng xem xét…"
            />

            {appealStatus && (
              <p className="p-3.5 rounded-xl bg-warning/10 border border-warning/30 text-xs font-bold text-warning">
                {appealStatus}
              </p>
            )}

            <Button
              type="button"
              onClick={handleSubmitAppeal}
              disabled={!appealReason.trim() || isSubmittingAppeal}
              size="sm"
            >
              {isSubmittingAppeal ? "Đang gửi khiếu nại…" : "Gửi Khiếu nại cho Giảng viên"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
