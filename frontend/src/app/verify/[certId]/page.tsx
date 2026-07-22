"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { CertificateService, type VerifiedCertificate } from "@/gen/certificate/v1/certificate_pb";
import { ThemeToggle } from "@/components/ThemeToggle";

interface VerifyPageProps {
  params: Promise<{ certId: string }>;
}

export default function VerifyPage({ params }: VerifyPageProps) {
  const resolvedParams = use(params);
  const certId = resolvedParams.certId;

  const [cert, setCert] = useState<VerifiedCertificate | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function verify() {
      try {
        const client = getRpcClient(CertificateService);
        const res = await client.verifyCertificatePublic({ certificateId: certId });
        setIsValid(res.isValid);
        if (res.certificate) {
          setCert(res.certificate);
        }
      } catch (err) {
        console.error("Lỗi xác thực chứng chỉ:", err);
        setIsValid(false);
      } fontFinally: {
        setLoading(false);
      }
    }

    verify();
  }, [certId]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadBadge = () => {
    if (!cert?.openBadgesJsonLd) return;
    const blob = new Blob([cert.openBadgesJsonLd], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `openbadge-${certId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
          <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span className="text-sm font-medium">Đang truy vấn xác thực chứng chỉ...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col justify-between transition-colors">
      {/* Public Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/courses" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              C
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Coursera AI
              </span>
              <span className="text-xs block text-slate-500 dark:text-slate-400 font-medium">Public Verification Portal</span>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12 w-full flex-1">
        {isValid && cert ? (
          <div className="space-y-8">
            {/* Status Verification Badge */}
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                ✓
              </div>
              <div>
                <h3 className="font-bold text-sm">Chứng chỉ Hợp lệ & Đã được Xác minh Chính thức</h3>
                <p className="text-xs opacity-90">Mã chứng chỉ #{cert.certificateId} được xác thực trên hệ thống Coursera LMS</p>
              </div>
            </div>

            {/* Certificate Presentation Document */}
            <div className="bg-white dark:bg-slate-900 border-8 border-slate-100 dark:border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
              {/* Background Watermark Decorative Accent */}
              <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

              {/* Top Partner Branding */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-8 mb-8">
                <div>
                  <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-1">
                    COURSERA VERIFIED SPECIALIZATION CERTIFICATE
                  </span>
                  <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300">{cert.partnerName}</h2>
                </div>
                {cert.partnerLogoUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={cert.partnerLogoUrl} alt={cert.partnerName} className="h-10 object-contain" />
                )}
              </div>

              {/* Certificate Body */}
              <div className="text-center py-6 space-y-6">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Chứng nhận này được trao cho</p>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight underline decoration-blue-500/30 underline-offset-8">
                  {cert.learnerName}
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xl mx-auto leading-relaxed">
                  Đã hoàn thành xuất sắc chương trình học chuyên sâu và đạt điểm vượt qua ở tất cả các bài kiểm tra đánh giá tính điểm cho khóa học:
                </p>
                <h3 className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 max-w-2xl mx-auto">
                  {cert.courseTitle}
                </h3>
              </div>

              {/* Certificate Footer */}
              <div className="pt-8 mt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Ngày cấp chứng chỉ</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{cert.issueDate}</p>
                </div>

                {/* QR Code */}
                {cert.qrCodeUrl && (
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cert.qrCodeUrl} alt="QR Verification" className="w-16 h-16 rounded-lg" />
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Quét mã QR</p>
                      <p className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">Xác thực công khai</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sharing & Export Actions */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <button
                onClick={handleCopyLink}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>{copied ? "✓ Đã sao chép liên kết" : "Sao chép liên kết xác thực"}</span>
              </button>

              <button
                onClick={handleDownloadBadge}
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Tải dữ liệu OpenBadges 2.0 (.json)</span>
              </button>
            </div>
          </div>
        ) : (
          /* Invalid / Not Found State */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-2xl mx-auto mb-6">
              ✕
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Chứng chỉ Không hợp lệ</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-8">
              Mã chứng chỉ <strong>#{certId}</strong> không tồn tại hoặc đã bị thu hồi khỏi hệ thống xác thực.
            </p>
            <Link
              href="/courses"
              className="inline-flex px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all"
            >
              Về trang danh sách khóa học
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
