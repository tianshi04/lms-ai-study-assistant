"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { Award, Search, ArrowRight, Check, Eye } from "lucide-react";

import { getRpcClient } from "@/lib/connect_client";
import { CertificateService, type VerifiedCertificate } from "@/gen/certificate/v1/certificate_pb";
import { useAuth } from "@/components/providers/AuthProvider";
import { Input } from "@/components/ui/Input";

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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-4">
            <Award className="w-4 h-4" />
            <span>Verified Credentials</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4 text-balance">
            {"Chứng chỉ của tôi"}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {"Quản lý các chứng chỉ bạn đã đạt được"}
          </p>
        </div>

        {!loading && (
          <div className="flex items-center gap-3">
            <div className="bg-card border border-border rounded-2xl px-5 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                {certificates.length}
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{"Tổng số chứng chỉ"}</p>
                <p className="text-sm font-bold text-foreground">{certificates.length} Verified</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search Bar */}
      {certificates.length > 0 && (
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={"Tìm kiếm chứng chỉ…"}
              autoComplete="off"
              spellCheck={false}
              className="w-full pl-11 pr-4 py-3 rounded-2xl"
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
              className="bg-card border border-border rounded-3xl p-6 animate-pulse h-72 flex flex-col justify-between"
            >
              <div>
                <div className="h-4 bg-muted rounded w-1/3 mb-4" />
                <div className="h-6 bg-muted rounded w-3/4 mb-3" />
                <div className="h-4 bg-muted rounded w-1/2 mb-6" />
              </div>
              <div className="h-10 bg-muted rounded-xl" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-6 rounded-2xl text-center">
          <p className="font-semibold">{error}</p>
        </div>
      ) : filteredCertificates.length === 0 ? (
        <div className="bg-card border border-border p-12 rounded-3xl text-center text-muted-foreground">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6">
            <Award className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">{"Chưa có chứng chỉ nào"}</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8 leading-relaxed">
            {"Bạn chưa đạt được chứng chỉ nào. Hãy hoàn thành khóa học để nhận chứng chỉ."}
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-sm transition-all"
          >
            <span>{"Khám phá khóa học"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-6">
          {filteredCertificates.map((cert) => (
            <div
              key={cert.certificateId}
              className="group relative hover:z-20 bg-card text-card-foreground border border-border hover:border-primary/50 rounded-3xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
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
                      <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {cert.partnerName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
                      {cert.partnerName}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-success/10 text-success border border-success/20 shrink-0">
                    <Check className="w-3.5 h-3.5" />
                    Verified
                  </span>
                </div>

                {/* Course Title */}
                <h3 className="text-lg font-bold text-foreground leading-snug line-clamp-2 mb-4 group-hover:text-primary transition-colors">
                  {cert.courseTitle}
                </h3>

                {/* Details */}
                <div className="space-y-2 text-xs text-muted-foreground bg-muted p-3.5 rounded-2xl border border-border">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{"Cấp ngày"}:</span>
                    <span className="font-semibold text-foreground">{cert.issueDate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{"Mã chứng chỉ"}:</span>
                    <span className="font-mono text-[11px] font-bold text-primary truncate max-w-[150px]">
                      {cert.certificateId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-border bg-muted/50 flex items-center gap-2 rounded-b-3xl">
                <Link
                  href={cert.verificationUrl || `/verify/${cert.certificateId}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-all cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
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
