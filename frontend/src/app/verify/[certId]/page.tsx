"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getRpcClient } from "@/lib/connect_client";
import { CertificateService, type VerifiedCertificate } from "@/gen/certificate/v1/certificate_pb";
import { Navbar } from "@/components/layout/Navbar";

interface VerifyPageProps {
  params: Promise<{ certId: string }>;
}

export default function VerifyPage({ params }: VerifyPageProps) {
  const resolvedParams = use(params);
  const certId = resolvedParams.certId;
  const router = useRouter();

  const [searchCertId, setSearchCertId] = useState(certId);
  const [cert, setCert] = useState<VerifiedCertificate | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function verify() {
      setLoading(true);
      try {
        const client = getRpcClient(CertificateService);
        const res = await client.verifyCertificatePublic({ certificateId: certId });
        setIsValid(res.isValid);
        if (res.certificate) {
          setCert(res.certificate);
        } else {
          setCert(null);
        }
      } catch (err) {
        console.error("Lỗi xác thực chứng chỉ:", err);
        setIsValid(false);
        setCert(null);
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [certId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCertId.trim()) {
      router.push(`/verify/${searchCertId.trim()}`);
    }
  };

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col justify-between transition-colors">
      <Navbar />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-10 w-full flex-1">
        {/* Interactive Search Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mb-8 shadow-sm">
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">
            Cổng Tra Cứu & Xác Minh Chứng Chỉ
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Nhập Mã chứng chỉ (Certificate ID) để tra cứu tính hợp lệ và truy xuất thông tin chứng nhận chính thức.
          </p>

          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={searchCertId}
              onChange={(e) => setSearchCertId(e.target.value)}
              placeholder="Nhập mã chứng chỉ (ví dụ: CERT-DEMO12345)"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Tra Cứu & Xác Minh</span>
            </button>
          </form>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
            <span>Đang kiểm tra và xác thực chứng chỉ...</span>
          </div>
        ) : isValid && cert ? (
          <div className="space-y-8">
            {/* Status Verification Badge */}
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-sm">Chứng chỉ Hợp lệ & Đã được Xác minh Chính thức</h3>
                <p className="text-xs opacity-90">Mã chứng chỉ #{cert.certificateId} được xác thực trên hệ thống Coursera LMS</p>
              </div>
            </div>

            {/* Certificate Presentation Document */}
            <div className="bg-white dark:bg-slate-900 border-8 border-slate-100 dark:border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
              <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

              {/* Top Partner Branding */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-8 mb-8">
                <div>
                  <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-1">
                    COURSERA VERIFIED SPECIALIZATION CERTIFICATE
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{cert.partnerName}</h2>
                </div>
                <Image src={cert.partnerLogoUrl} alt={cert.partnerName} width={140} height={48} unoptimized className="h-12 w-auto object-contain" />
              </div>

              {/* Recipient & Course Detail */}
              <div className="space-y-6 text-center sm:text-left">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider block mb-1">Chứng nhận cấp cho</span>
                  <h3 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">{cert.learnerName}</h3>
                </div>

                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider block mb-1">Đã hoàn thành xuất sắc khóa học</span>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">{cert.courseTitle}</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Ngày cấp chứng nhận:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{cert.issueDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Mã tra cứu định danh:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{cert.certificateId}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Verification Seal & QR Code */}
              <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <Image src={cert.qrCodeUrl} alt="Certificate Verification QR Code" width={80} height={80} unoptimized className="w-20 h-20 rounded-xl border p-1 bg-white" />
                  <div className="text-left text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-900 dark:text-white">Xác minh nguồn gốc kỹ thuật số</p>
                    <p className="text-[11px]">Quét mã QR để kiểm tra tính toàn vẹn của bằng cấp công khai.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Đã sao chép Link</span>
                      </>
                    ) : (
                      <span>Sao chép Link Xác minh</span>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadBadge}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    Tải Hồ Sơ Chứng Chỉ (JSON)
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-3xl p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-xl mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-rose-700 dark:text-rose-400">
              Không Tìm Thấy Mã Chứng Chỉ #{certId}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
              Mã chứng chỉ này không tồn tại trong hệ thống hoặc đã bị thu hồi. Vui lòng kiểm tra lại chính xác mã chứng chỉ.
            </p>
            <button
              onClick={() => {
                setSearchCertId("CERT-DEMO12345");
                router.push("/verify/CERT-DEMO12345");
              }}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold inline-block"
            >
              Thử mã mẫu demo (CERT-DEMO12345)
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
