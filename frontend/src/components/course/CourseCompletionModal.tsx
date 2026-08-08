"use client";

import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";

import { getRpcClient } from "@/lib/connect_client";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
import { CertificateService } from "@/gen/certificate/v1/certificate_pb";
import { useAuth } from "@/components/providers/AuthProvider";
import { useCourseDetailQuery } from "@/lib/query_hooks";
import { Trophy, AlertTriangle, CheckCircle2, Check, Pencil, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

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
  useEffect(() => {
    if (!isOpen || !courseId) return;

    async function fetchCert() {
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
        console.error("Failed to load certificate in modal:", err);
        const msg = err instanceof Error ? err.message : "Không thể tải thông tin chứng chỉ";
        setCertError(msg);
      } finally {
        setLoadingCert(false);
      }
    }
    fetchCert();
  }, [isOpen, courseId]);

  const { userId: authUserId, userName } = useAuth();
  const { data: course } = useCourseDetailQuery(courseId);

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
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent size="lg" className="max-w-lg p-0 overflow-hidden">
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
              <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              <span aria-live="polite">{"Đang tải…"}</span>
            </div>
          ) : certError ? (
            <div className="relative z-20 mt-5 mx-auto max-w-sm p-3.5 rounded-xl bg-destructive/20 border border-destructive/30 text-primary-foreground text-xs text-left backdrop-blur-sm">
              <span className="font-bold flex items-center gap-1.5 mb-1 text-destructive-foreground">
                <AlertTriangle className="w-4 h-4 text-destructive-foreground" aria-hidden="true" />
                <span>{"Không thể Xác minh Chứng chỉ"}</span>
              </span>
              <span className="opacity-90 leading-relaxed block">{certError}</span>
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
                    variant="ghost"
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
                        <Button
                          key={star}
                          type="button"
                          variant="ghost"
                          size="icon"
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
                        </Button>
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
                  <Button type="button" variant="outline" size="sm" onClick={onClose}>
                    {"Hủy"}
                  </Button>
                  <Button type="submit" isLoading={submitting} size="sm">
                    {"Gửi đánh giá"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
