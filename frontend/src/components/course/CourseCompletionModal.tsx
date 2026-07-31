"use client";

import React, { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
import { CertificateService } from "@/gen/certificate/v1/certificate_pb";

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

  // Fetch existing review if any
  useEffect(() => {
    if (!isOpen || !courseId) return;

    const activeUserId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
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
  }, [isOpen, courseId]);

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
    <Modal isOpen={isOpen} onClose={onClose} title="" className="max-w-lg p-0 overflow-hidden">
      <div className="relative bg-gradient-to-b from-blue-600 to-indigo-700 p-6 text-white text-center rounded-t-2xl overflow-hidden">
        {/* Celebration Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10" />

        {/* Trophy SVG Icon */}
        <div className="relative z-20 mx-auto w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 border border-white/20 shadow-inner">
          <svg
            className="w-9 h-9 text-amber-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-6.75a1.125 1.125 0 01-1.125-1.125V18.75m9-13.5h-9m9 0a2.25 2.25 0 002.25-2.25V3h-13.5v.75A2.25 2.25 0 007.5 5.25m9 0v3.375a3.375 3.375 0 01-3.375 3.375h-2.25A3.375 3.375 0 017.5 8.625V5.25"
            />
          </svg>
        </div>

        <h2 className="relative z-20 text-2xl font-extrabold tracking-tight">Course Completed!</h2>
        <p className="relative z-20 text-blue-100 text-sm mt-1 max-w-sm mx-auto line-clamp-2">
          {courseTitle}
        </p>

        {loadingCert ? (
          <div className="relative z-20 mt-5 mx-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/15 text-slate-100 text-xs font-semibold backdrop-blur-sm border border-white/10">
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span aria-live="polite">{"Đang tải…"}</span>
          </div>
        ) : certError ? (
          <div className="relative z-20 mt-5 mx-auto max-w-sm p-3.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-100 text-xs text-left backdrop-blur-sm">
            <span className="font-bold flex items-center gap-1.5 mb-1">
              <svg
                className="w-4 h-4 text-red-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{"Không thể Xác minh Chứng chỉ"}</span>
            </span>
            <span className="opacity-90 leading-relaxed block">{certError}</span>
          </div>
        ) : (
          <button
            onClick={handleClaimCertificate}
            className="relative z-20 mt-5 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow-lg hover:shadow-amber-400/25 transition-all transform active:scale-95 cursor-pointer"
          >
            <svg
              className="w-5 h-5 text-slate-950"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{"Xem Chứng Chỉ"}</span>
          </button>
        )}
      </div>

      {/* Course Review & Rating Section */}
      <div className="p-6 bg-white dark:bg-slate-900 space-y-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {"Đánh giá & Nhận xét từ Học viên"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {"Các nhận xét thực tế từ học viên đã tham gia khóa học này"}
          </p>
        </div>

        {submitted ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl text-center space-y-2">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/60 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
              {"Đã gửi đánh giá thành công!"}
            </h4>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              {"Cảm ơn bạn đã phản hồi ý kiến cho khóa học."}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                  />
                </svg>
                <span>{"Viết / Sửa đánh giá"}</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitReview} className="space-y-4">
            {/* Interactive 1-5 Star Picker */}
            <div className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                {"Chọn số sao đánh giá:"} ({hoverRating || rating}/5)
              </span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= (hoverRating || rating);
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 cursor-pointer transition-transform hover:scale-110 focus:outline-none"
                    >
                      <svg
                        className={`w-8 h-8 transition-colors ${
                          active
                            ? "text-amber-400 fill-amber-400"
                            : "text-slate-300 dark:text-slate-700"
                        }`}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.116.486-.413.87-.837.614L12 17.653l-4.708 2.89c-.424.256-.953-.128-.837-.614l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602c-.38-.325-.178-.948.32-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                        />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comment Textarea */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {"Nội dung nhận xét:"}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={"Chia sẻ trải nghiệm học tập, đánh giá nội dung bài giảng…"}
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent focus-visible:outline-none transition-all resize-none"
              />
            </div>

            {errorMessage && (
              <p className="text-xs text-red-500 dark:text-red-400 font-medium">{errorMessage}</p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                {"Hủy"}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <span aria-live="polite">{submitting ? "Đang gửi…" : "Gửi đánh giá"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
