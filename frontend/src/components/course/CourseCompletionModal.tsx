"use client";

import React, { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";

import { getRpcClient } from "@/lib/connect_client";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
import { CertificateService } from "@/gen/certificate/v1/certificate_pb";
import { IdentityService } from "@/gen/identity/v1/identity_pb";
import { useAuth } from "@/components/providers/AuthProvider";
import { useCourseDetailQuery } from "@/lib/query_hooks";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";
import {
  Trophy,
  AlertTriangle,
  CheckCircle2,
  Check,
  Pencil,
  Star,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Textarea } from "@/components/ui/Textarea";
import { Progress } from "@/components/ui/Progress";

export interface CourseCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  certificateId?: string;
}

export const CourseCompletionModal: React.FC<CourseCompletionModalProps> = ({
  isOpen,
  onClose,
  courseId,
  courseTitle,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toast = useToast();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Certificate Fetching States
  const [realCertId, setRealCertId] = useState<string | null>(null);
  const [certError, setCertError] = useState<string | null>(null);
  const [loadingCert, setLoadingCert] = useState<boolean>(true);

  // Confetti / Fireworks Canvas Effect
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 480;
    canvas.height = 180;

    let animationFrameId: number;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      radius: number;
      alpha: number;
    }> = [];

    const colors = ["#2563eb", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.7) * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        radius: Math.random() * 4 + 2,
        alpha: 1,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // Gravity
        p.alpha -= 0.012;

        if (p.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
          ctx.restore();
        }
      });

      if (particles.some((p) => p.alpha > 0)) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isOpen]);

  // Fetch verified certificate dynamically
  const fetchCert = React.useCallback(async () => {
    if (!courseId) return;
    setLoadingCert(true);
    setCertError(null);
    try {
      const client = getRpcClient(CertificateService);
      const res = await client.getVerifiedCertificate({ courseId });
      if (res.certificate?.certificateId) {
        setRealCertId(res.certificate.certificateId);
      } else {
        setCertError("Không thể tải thông tin chứng chỉ");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể tải thông tin chứng chỉ";
      if (
        !msg.includes("BR_CERT_003") &&
        !msg.includes("KYC") &&
        !msg.includes("Xác minh Danh tính")
      ) {
        console.error("Failed to load certificate in modal:", err);
      }
      setCertError(msg);
    } finally {
      setLoadingCert(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (isOpen && courseId) {
      fetchCert();
    }
  }, [isOpen, courseId, fetchCert]);

  const isKycError = Boolean(
    certError &&
    (certError.includes("KYC") ||
      certError.includes("Xác minh Danh tính") ||
      certError.includes("BR_CERT_003")),
  );

  const { userId: authUserId, userName } = useAuth();
  const { data: course } = useCourseDetailQuery(courseId);
  const [verifyingKyc, setVerifyingKyc] = useState<boolean>(false);

  const handleQuickKycVerify = async () => {
    if (!authUserId) return;
    setVerifyingKyc(true);
    try {
      const client = getRpcClient(IdentityService);
      const res = await client.verifyIdentity({
        userId: authUserId,
        idCardNumber: "012345678999",
      });
      if (res.success) {
        toast.success("Xác minh danh tính KYC thành công!");
        await fetchCert();
      } else {
        toast.error(res.message || "Xác minh thất bại.");
      }
    } catch (err: unknown) {
      console.error("Failed to verify KYC in modal:", err);
      toast.error("Lỗi khi xác minh danh tính.");
    } finally {
      setVerifyingKyc(false);
    }
  };

  const isOwnCourse = !!(
    course &&
    ((authUserId && course.ownerId === authUserId) ||
      (authUserId && course.coInstructorIds?.includes(authUserId)) ||
      (userName && course.instructorNames?.includes(userName)))
  );

  // Fetch existing review if any
  useEffect(() => {
    if (!isOpen || !courseId) return;

    const activeUserId = authUserId;
    if (!activeUserId) return;

    async function checkExistingReview() {
      try {
        const client = getRpcClient(CatalogService);
        const res = await client.listCourseReviews({ courseId });
        const myReview = res.reviews.find((r) => r.userId === activeUserId);
        if (myReview) {
          setRating(myReview.ratingStars);
          setComment(myReview.commentText);
          setSubmitted(true);
        } else {
          setSubmitted(false);
        }
      } catch (err) {
        console.error("Failed to check existing review:", err);
      }
    }
    checkExistingReview();
  }, [isOpen, courseId, authUserId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const client = getRpcClient(CatalogService);
      await client.submitCourseReview({
        courseId,
        ratingStars: rating,
        commentText: comment,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      console.error("Failed to submit course review:", err);
      const msg = err instanceof Error ? err.message : "Đang gửi…";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClaimCertificate = () => {
    if (realCertId) {
      window.open(`/verify/${realCertId}`, "_blank");
    }
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Content size="lg" className="max-w-lg p-0 overflow-hidden">
        <div className="relative bg-primary p-6 text-primary-foreground text-center rounded-t-2xl overflow-hidden">
          {/* Celebration Canvas */}
          <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10" />

          {/* Trophy SVG Icon */}
          <div className="relative z-20 mx-auto w-16 h-16 bg-primary-foreground/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 border border-primary-foreground/20 shadow-inner">
            <Trophy className="w-9 h-9 text-warning" aria-hidden="true" />
          </div>

          <h2 className="relative z-20 text-2xl font-extrabold tracking-tight">
            Course Completed!
          </h2>
          <p className="relative z-20 text-primary-foreground/90 text-sm mt-1 max-w-sm mx-auto min-w-0 line-clamp-2">
            {courseTitle}
          </p>

          {loadingCert ? (
            <div className="relative z-20 mt-5 mx-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-foreground/15 text-primary-foreground text-xs font-semibold backdrop-blur-sm border border-primary-foreground/10">
              <Progress.Circular
                size="sm"
                className="w-3.5 h-3.5"
                color="warning"
                ariaLabel="Đang tải chứng chỉ"
              />
              <span aria-live="polite">{"Đang tải…"}</span>
            </div>
          ) : certError ? (
            <div className="relative z-20 mt-5 mx-auto max-w-sm p-4 rounded-xl bg-destructive/20 border border-destructive/30 text-primary-foreground text-xs text-left backdrop-blur-sm space-y-3">
              <div className="flex items-start gap-2.5">
                {isKycError ? (
                  <ShieldAlert
                    className="w-5 h-5 text-amber-300 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                ) : (
                  <AlertTriangle
                    className="w-4 h-4 text-destructive-foreground shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                )}
                <div>
                  <span className="font-bold block mb-1 text-sm text-primary-foreground">
                    {isKycError
                      ? "Yêu cầu Xác minh Danh tính (KYC/CCCD)"
                      : "Không thể Xác minh Chứng chỉ"}
                  </span>
                  <span className="opacity-90 leading-relaxed block text-xs">{certError}</span>
                </div>
              </div>

              {isKycError && (
                <div className="pt-2 flex flex-col gap-2">
                  <Button
                    type="button"
                    onClick={handleQuickKycVerify}
                    disabled={verifyingKyc}
                    size="sm"
                    className="w-full bg-warning hover:bg-warning-hover text-warning-foreground font-bold shadow-md flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {verifyingKyc ? "Đang xác minh KYC…" : "Xác minh KYC Nhanh (Giả lập CCCD)"}
                    </span>
                  </Button>

                  <Link href="/account-settings" target="_blank" className="w-full">
                    <Button
                      type="button"
                      variant="text"
                      size="sm"
                      className="w-full text-xs text-primary-foreground hover:bg-primary-foreground/10 flex items-center justify-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" aria-hidden="true" />
                      <span>{"Mở trang Cài đặt tài khoản (/account-settings)"}</span>
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <Button
              onClick={handleClaimCertificate}
              className="relative z-20 mt-5 bg-warning hover:bg-warning-hover text-warning-foreground shadow-lg"
            >
              <CheckCircle2 className="w-5 h-5 mr-1.5" aria-hidden="true" />
              <span>{"Xem Chứng Chỉ"}</span>
            </Button>
          )}
        </div>

        {/* Course Review & Rating Section */}
        {!isOwnCourse && (
          <div className="p-6 bg-card space-y-5">
            <div>
              <h3 className="text-base font-bold text-foreground">
                {"Đánh giá & Nhận xét từ Học viên"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {"Các nhận xét thực tế từ học viên đã tham gia khóa học này"}
              </p>
            </div>

            {submitted ? (
              <div className="bg-success/10 border border-success/30 p-4 rounded-xl text-center space-y-2">
                <div className="w-10 h-10 bg-success/20 rounded-full flex items-center justify-center mx-auto text-success">
                  <Check className="w-6 h-6" aria-hidden="true" />
                </div>
                <h4 className="text-sm font-bold text-success">{"Đã gửi đánh giá thành công!"}</h4>
                <p className="text-xs text-success">
                  {"Cảm ơn bạn đã phản hồi ý kiến cho khóa học."}
                </p>
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="text"
                    size="sm"
                    onClick={() => setSubmitted(false)}
                    className="text-primary"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                    <span>{"Đánh giá"}</span>
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Interactive 1-5 Star Picker */}
                <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-xl border border-border">
                  <span className="text-xs font-semibold text-muted-foreground mb-2">
                    {"Chọn số sao đánh giá:"} ({hoverRating || rating}/5)
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = star <= (hoverRating || rating);
                      return (
                        <IconButton
                          key={star}
                          type="button"
                          variant="standard"
                          size="sm"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="h-9 w-9 p-1"
                          aria-label={`Đánh giá ${star} sao`}
                        >
                          <Star
                            aria-hidden="true"
                            className={`w-8 h-8 transition-colors ${
                              active ? "text-amber-400 fill-amber-400" : "text-muted-foreground/40"
                            }`}
                          />
                        </IconButton>
                      );
                    })}
                  </div>
                </div>

                {/* Comment Textarea */}
                <div>
                  <Textarea
                    label="Nội dung nhận xét:"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={"Chia sẻ trải nghiệm học tập, đánh giá nội dung bài giảng…"}
                    rows={3}
                  />
                </div>

                {errorMessage && (
                  <p className="text-xs text-destructive font-medium">{errorMessage}</p>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button type="button" variant="text" size="sm" onClick={onClose}>
                    {"Hủy"}
                  </Button>
                  <Button type="submit" disabled={submitting} size="sm">
                    {"Gửi đánh giá"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
};
