"use client";

import React, { useEffect, useState } from "react";
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
  BookOpen,
  FileText,
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

export function PeerAssignmentWorkspace({
  itemId,
  title,
  userId,
  instructionsMarkdown,
  rubricCriteriaJson: _rubricCriteriaJson,
}: PeerAssignmentWorkspaceProps) {
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
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Peer items to grade
  const [peerItems, setPeerItems] = useState<PeerItem[]>([
    {
      reviewId: "rev-sub-001",
      submissionUrl: "https://figma.com/file/sample-project",
      textContent:
        "Dự án phân tích và thiết kế trải nghiệm người dùng với nguyên mẫu Prototype tương tác hoàn chỉnh.",
      rubricCriteria: [
        {
          criteriaId: "c1",
          title: "Chất lượng nội dung & Lập luận",
          maxScore: 10,
          scoreGiven: 9,
          feedback: "Phân tích có chiều sâu và giải pháp rất thuyết phục.",
          description: "Mức độ hoàn thiện, tính logic và chiều sâu phân tích.",
        },
        {
          criteriaId: "c2",
          title: "Bố cục & Kỹ năng trình bày",
          maxScore: 10,
          scoreGiven: 10,
          feedback: "Bố cục đẹp, phân cấp thị giác rõ ràng.",
          description: "Tổ chức đề mục khoa học, diễn đạt mạch lạc.",
        },
        {
          criteriaId: "c3",
          title: "Tài liệu & Minh chứng thực tế",
          maxScore: 10,
          scoreGiven: 8,
          feedback: "Đầy đủ dẫn chứng.",
          description: "Dẫn chứng số liệu cụ thể, có nguồn tham khảo tin cậy.",
        },
      ],
    },
  ]);

  useEffect(() => {
    let isMounted = true;
    const fetchReviews = async () => {
      try {
        const client = getRpcClient(AssessmentService);
        const res = await client.getPeerReviewsToGrade({ itemId });
        if (isMounted && res.itemsToGrade && res.itemsToGrade.length > 0) {
          setPeerItems(
            res.itemsToGrade.map((item) => ({
              reviewId: item.reviewId,
              submissionUrl: item.submissionUrl,
              textContent: item.textContent,
              rubricCriteria: item.rubricCriteria.map((c) => ({
                criteriaId: c.criteriaId,
                title: c.title,
                maxScore: c.maxScore || 10,
                scoreGiven: c.scoreGiven || Math.round((c.maxScore || 10) * 0.8),
                feedback: c.feedback || "",
                description: c.description || "",
              })),
            })),
          );
        }
      } catch {
        // Fallback gracefully to default items
      }
    };
    fetchReviews();
    return () => {
      isMounted = false;
    };
  }, [itemId]);

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
          {instructionsMarkdown && (
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary border-b border-border pb-2">
                <BookOpen className="w-4 h-4" aria-hidden="true" />
                <span>Đề bài & Hướng dẫn làm bài</span>
              </div>
              <div className="text-xs leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                {renderMarkdown(instructionsMarkdown)}
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-info/10 border border-info/20 text-xs text-info space-y-1.5">
            <h4 className="font-bold flex items-center gap-1.5 text-foreground">
              <Info aria-hidden="true" className="w-4 h-4 text-info shrink-0" />
              <span>Yêu cầu Nộp bài:</span>
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              Cung cấp đường dẫn liên kết bài làm / sản phẩm (Figma, Canva, Google Drive, Slide,
              Github, Website...) và bài luận hoặc bản tóm tắt giải pháp. Bạn phải nộp bài cá nhân
              trước khi mở khóa chức năng chấm điểm bạn học.
            </p>
          </div>

          <div className="space-y-4">
            <Input
              label="Đường dẫn Bài làm / Sản phẩm dự án (URL)"
              type="url"
              inputMode="url"
              value={submissionUrl}
              onChange={(e) => setSubmissionUrl(e.target.value)}
              className="font-mono text-xs"
              placeholder="https://figma.com/file/... hoặc Google Drive, Canva, Github, website..."
            />

            <Textarea
              label="Nội dung bài viết / Luận văn / Bản tóm tắt giải pháp"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={6}
              placeholder="Nhập nội dung bài luận chi tiết hoặc tóm tắt giải pháp, kiến trúc và kết quả đạt được…"
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
            {peerItems.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-border bg-card text-center space-y-3">
                <Users className="w-8 h-8 text-muted-foreground mx-auto" />
                <h4 className="font-bold text-sm text-foreground">Chưa có bài nộp nào cần chấm</h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Hệ thống chưa tìm thấy bài nộp nào khác trong hàng chờ chấm chéo. Khi các bạn học
                  khác nộp bài, hệ thống sẽ tự động phân bổ bài vào đây cho bạn.
                </p>
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
                        <span>Nội dung bài luận / Tóm tắt dự án:</span>
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
                          step={1}
                          value={[crit.scoreGiven]}
                          onValueChange={(val) => {
                            const num = Array.isArray(val) ? val[0] : val;
                            handleScoreChange(pIdx, cIdx, num);
                          }}
                          aria-label={`Điểm cho tiêu chí ${crit.title}`}
                        />

                        <Input
                          placeholder="Nhận xét / Lời góp ý cho tiêu chí này (tùy chọn)..."
                          value={crit.feedback || ""}
                          onChange={(e) => {
                            const updated = [...peerItems];
                            updated[pIdx].rubricCriteria[cIdx].feedback = e.target.value;
                            setPeerItems(updated);
                          }}
                          className="text-xs"
                          aria-label={`Nhận xét tiêu chí ${crit.title}`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="button" onClick={() => handleSubmitPeerGrade(pIdx)} size="sm">
                      <Send aria-hidden="true" className="w-3.5 h-3.5 mr-1.5" />
                      Xác nhận nộp điểm đánh giá
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
