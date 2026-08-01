"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, Check, X } from "lucide-react";

interface VerifiedCertPayload {
  isValid: boolean;
  statusMessage: string;
  certificate: {
    certificateId: string;
    learnerName: string;
    courseTitle: string;
    issueDate: string;
    partnerName: string;
    partnerLogoUrl: string;
    signerName?: string;
    signerTitle?: string;
    signatureImageUrl?: string;
    qrCodeUrl: string;
    openBadgesJsonLd?: string;
  } | null;
}

export function VerifyDetailClient({
  certId,
  initialData,
}: {
  certId: string;
  initialData: VerifiedCertPayload;
}) {
  const router = useRouter();

  const [searchCertId, setSearchCertId] = useState(certId);
  const [copied, setCopied] = useState(false);

  const cert = initialData.certificate;
  const isValid = initialData.isValid;
  const statusMsg = initialData.statusMessage;

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
    <main className="max-w-4xl mx-auto px-4 py-10 w-full flex-1">
      {/* Interactive Search Bar */}
      <div className="bg-card border border-border rounded-3xl p-6 mb-8 shadow-sm">
        <h1 className="text-xl font-extrabold text-foreground mb-2 text-balance">
          {"Xác minh & Tra cứu Chứng chỉ"}
        </h1>
        <p className="text-xs text-muted-foreground mb-4">
          {
            "Nhập Mã chứng chỉ (Certificate ID) để tra cứu tính hợp lệ và chi tiết bằng cấp trực tuyến."
          }
        </p>

        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={searchCertId}
            onChange={(e) => setSearchCertId(e.target.value)}
            placeholder={"Nhập mã chứng chỉ (ví dụ: CERT-DEMO12345)…"}
            spellCheck={false}
            autoComplete="off"
            className="flex-1 px-4 py-3 rounded-xl border border-input bg-muted text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono transition-colors"
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>{"Tra cứu Chứng chỉ"}</span>
          </button>
        </form>
      </div>

      {isValid && cert ? (
        <div className="space-y-8">
          {/* Status Verification Badge */}
          <div className="bg-success/10 border border-success/20 rounded-2xl p-4 flex items-center gap-3 text-success">
            <div className="w-8 h-8 rounded-full bg-success text-success-foreground flex items-center justify-center font-bold flex-shrink-0">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">{"Chứng chỉ Xác minh Chính thức"}</h3>
              <p className="text-xs opacity-90">
                {
                  "Chứng chỉ này hoàn toàn hợp lệ và được lưu trữ trên hệ thống cơ sở dữ liệu Coursera AI LMS."
                }{" "}
                (#{cert.certificateId})
              </p>
            </div>
          </div>

          {/* Certificate Presentation Document */}
          <div className="bg-card border-8 border-border rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

            {/* Top Partner Branding */}
            <div className="flex items-center justify-between border-b border-border pb-8 mb-8">
              <div>
                <span className="text-xs font-bold font-mono text-primary uppercase tracking-widest block mb-1">
                  COURSERA VERIFIED SPECIALIZATION CERTIFICATE
                </span>
                <h2 className="text-2xl font-black text-foreground tracking-tight">
                  {cert.partnerName}
                </h2>
              </div>
              {cert.partnerLogoUrl && (
                <Image
                  src={cert.partnerLogoUrl}
                  alt={cert.partnerName}
                  width={140}
                  height={48}
                  unoptimized
                  className="h-12 w-auto object-contain"
                />
              )}
            </div>

            {/* Recipient & Course Detail */}
            <div className="space-y-6 text-center sm:text-left">
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider block mb-1">
                  {"Học viên nhận chứng chỉ"}
                </span>
                <h3 className="text-3xl font-extrabold text-primary tracking-tight">
                  {cert.learnerName}
                </h3>
              </div>

              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider block mb-1">
                  {"Khóa học hoàn thành"}
                </span>
                <h4 className="text-xl font-bold text-foreground leading-snug">
                  {cert.courseTitle}
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border text-xs">
                <div>
                  <span className="text-muted-foreground block font-medium">{"Ngày cấp"}:</span>
                  <span className="font-bold text-foreground font-mono">{cert.issueDate}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">{"Mã xác thực"}:</span>
                  <span className="font-bold text-primary font-mono">{cert.certificateId}</span>
                </div>
              </div>

              {/* Official Signer & Handwritten Signature Section */}
              {(cert.signerName || cert.signatureImageUrl) && (
                <div className="pt-6 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold block mb-0.5">
                      {"Xác nhận bảo chứng bởi"}
                    </span>
                    <p className="text-xs font-bold text-foreground">{cert.partnerName}</p>
                  </div>

                  <div className="text-right">
                    {cert.signatureImageUrl ? (
                      <Image
                        src={cert.signatureImageUrl}
                        alt={cert.signerName || "Chữ ký người bảo chứng"}
                        width={140}
                        height={48}
                        unoptimized
                        className="h-12 w-auto object-contain ml-auto mb-1 dark:invert"
                      />
                    ) : (
                      <div className="h-10 border-b border-border w-32 ml-auto mb-1 font-serif italic text-sm text-muted-foreground flex items-end justify-end">
                        {cert.signerName}
                      </div>
                    )}
                    <p className="text-sm font-extrabold text-foreground">{cert.signerName}</p>
                    {cert.signerTitle && (
                      <p className="text-xs text-muted-foreground font-medium">
                        {cert.signerTitle}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Verification Seal & QR Code */}
            <div className="mt-10 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {cert.qrCodeUrl && (
                  <Image
                    src={cert.qrCodeUrl}
                    alt="Certificate Verification QR Code"
                    width={80}
                    height={80}
                    unoptimized
                    className="w-20 h-20 rounded-xl border p-1 bg-white"
                  />
                )}
                <div className="text-left text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">
                    {"Được xác thực bởi Coursera AI LMS Platform"}
                  </p>
                  <p className="text-[11px]">Scan QR code to verify digital signature integrity.</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-success" />
                      <span>Copied Link</span>
                    </>
                  ) : (
                    <span>Copy Verification Link</span>
                  )}
                </button>
                <button
                  onClick={handleDownloadBadge}
                  className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold shadow-lg shadow-primary/20 transition-all cursor-pointer"
                >
                  Download Badge (JSON)
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-destructive/10 border border-destructive/20 rounded-3xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center font-bold text-xl mx-auto">
            <X className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-destructive">{"Không thể Xác minh Chứng chỉ"}</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {statusMsg || `${"Không tìm thấy chứng chỉ với mã đã nhập"} #${certId}`}
          </p>
          <button
            onClick={() => {
              setSearchCertId("CERT-DEMO12345");
              router.push("/verify/CERT-DEMO12345");
            }}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-block cursor-pointer"
          >
            Demo Code: CERT-DEMO12345
          </button>
        </div>
      )}
    </main>
  );
}
