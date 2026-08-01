"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";

import { getRpcClient } from "@/lib/connect_client";
import { CertificateService, type VerifiedCertificate } from "@/gen/certificate/v1/certificate_pb";
import { useAuth } from "@/components/providers/AuthProvider";

const emptySubscribe = () => () => {};

export default function MyCertificatesPage() {
  const { isAuthenticated } = useAuth();
  const [certificates, setCertificates] = useState<VerifiedCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!isMounted) return;

    if (!isAuthenticated) {
      window.location.href = "/auth/login?redirect=/certificates";
      return;
    }

    let isCancelled = false;

    async function fetchCertificates() {
      try {
        const client = getRpcClient(CertificateService);
        const res = await client.listMyCertificates({});
        if (!isCancelled) {
          setCertificates(res.certificates || []);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error("Failed to fetch user certificates:", err);
          setError(err instanceof Error ? err.message : "Lỗi tải chứng chỉ");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchCertificates();

    return () => {
      isCancelled = true;
    };
  }, [isMounted]);

  const filteredCertificates = certificates.filter((cert) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      cert.courseTitle.toLowerCase().includes(term) ||
      cert.certificateId.toLowerCase().includes(term) ||
      cert.partnerName.toLowerCase().includes(term)
    );
  });

  return (
    <main className="w-full max-w-7xl mx-auto px-6 py-12 flex-1">
      {/* Header Section */}
      <div className="w-full mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
            <span>Verified Credentials</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4 text-balance">
            {"Chứng chỉ của tôi"}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
            {"Quản lý các chứng chỉ bạn đã đạt được"}
          </p>
        </div>

        {!loading && (
          <div className="flex items-center gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">
                {certificates.length}
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {"Tổng số chứng chỉ"}
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {certificates.length} Verified
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search Bar */}
      {certificates.length > 0 && (
        <div className="mb-8">
          <div className="relative max-w-md">
            <svg
              className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={"Tìm kiếm chứng chỉ…"}
              autoComplete="off"
              spellCheck={false}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 text-sm transition-colors shadow-sm"
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 animate-pulse shadow-sm h-72 flex flex-col justify-between"
            >
              <div>
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-4" />
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-6" />
              </div>
              <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-6 rounded-2xl text-center">
          <p className="font-semibold">{error}</p>
        </div>
      ) : filteredCertificates.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-12 rounded-3xl text-center text-slate-500 dark:text-slate-400 shadow-sm">
          <div className="w-20 h-20 mx-auto rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 mb-6">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {"Chưa có chứng chỉ nào"}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto mb-8 leading-relaxed">
            {"Bạn chưa đạt được chứng chỉ nào. Hãy hoàn thành khóa học để nhận chứng chỉ."}
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-600/20"
          >
            <span>{"Khám phá khóa học"}</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-6">
          {filteredCertificates.map((cert) => (
            <div
              key={cert.certificateId}
              className="group relative hover:z-20 bg-card text-card-foreground border border-border rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="p-6 rounded-t-3xl">
                {/* Header Badge & Partner */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    {cert.partnerLogoUrl ? (
                      <Image
                        src={cert.partnerLogoUrl}
                        alt={cert.partnerName}
                        width={28}
                        height={28}
                        unoptimized
                        className="w-7 h-7 object-contain rounded"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded bg-blue-500/10 flex items-center justify-center text-blue-600 font-bold text-xs">
                        {cert.partnerName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                      {cert.partnerName}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shrink-0">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Verified
                  </span>
                </div>

                {/* Course Title */}
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 mb-4 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {cert.courseTitle}
                </h3>

                {/* Details */}
                <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{"Cấp ngày"}:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {cert.issueDate}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{"Mã chứng chỉ"}:</span>
                    <span className="font-mono text-[11px] font-bold text-purple-600 dark:text-purple-400 truncate max-w-[150px]">
                      {cert.certificateId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-border bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2 rounded-b-3xl">
                <Link
                  href={cert.verificationUrl || `/verify/${cert.certificateId}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/10 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  <span>{"Xem chứng chỉ"}</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
