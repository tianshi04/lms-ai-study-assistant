"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Check, X, Share2, Download, FileDown } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  CertificateDocument,
  type CertificateDocumentData,
} from "@/components/certificate/CertificateDocument";
import { shareContent } from "@/lib/share";
import { useDownloadCertificatePdf } from "@/lib/hooks/useDownloadCertificatePdf";

interface VerifiedCertPayload {
  isValid: boolean;
  statusMessage: string;
  certificate: CertificateDocumentData | null;
}

export function VerifyDetailClient({
  certId,
  initialData,
}: {
  certId: string;
  initialData: VerifiedCertPayload;
}) {
  const router = useRouter();
  const toast = useToast();

  const [searchCertId, setSearchCertId] = useState(certId);
  const { downloadingCertId, downloadPdf } = useDownloadCertificatePdf();
  const downloadingPdf = downloadingCertId !== null;

  const cert = initialData.certificate;
  const isValid = initialData.isValid;
  const statusMsg = initialData.statusMessage;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCertId.trim()) {
      router.push(`/verify/${searchCertId.trim()}`);
    }
  };

  const handleFallbackCopy = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => {
          toast.success("Đã sao chép liên kết chứng chỉ vào bộ nhớ tạm!");
        })
        .catch(() => {});
    }
  };

  const handleShareCertificate = () => {
    if (!cert) return;
    shareContent({
      title: `Chứng chỉ xác thực: ${cert.courseTitle}`,
      text: `Chứng chỉ hoàn thành khóa học "${cert.courseTitle}" cấp bởi ${cert.partnerName} cho học viên ${cert.learnerName}.`,
      url: typeof window !== "undefined" ? window.location.href : "",
      onFallbackCopy: handleFallbackCopy,
    });
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

  const handleDownloadPdf = async () => {
    if (!cert) return;
    await downloadPdf(cert.certificateId);
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 w-full flex-1">
      {/* Interactive Search Bar */}
      <div className="bg-card border border-border rounded-3xl p-6 mb-8 shadow-sm">
        <h1 className="text-xl font-extrabold text-foreground mb-2 text-balance">
          Xác minh &amp; Tra cứu Chứng chỉ
        </h1>
        <p className="text-xs text-muted-foreground mb-4">
          Nhập Mã chứng chỉ (Certificate ID) để tra cứu tính hợp lệ và chi tiết bằng cấp trực tuyến.
        </p>

        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <Input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              aria-label="Nhập mã chứng chỉ"
              value={searchCertId}
              onChange={(e) => setSearchCertId(e.target.value)}
              placeholder="Nhập mã chứng chỉ (ví dụ: CERT-DEMO12345)…"
              spellCheck={false}
              autoComplete="off"
              className="font-mono"
            />
          </div>
          <Button type="submit" size="md">
            <Search aria-hidden="true" className="w-4 h-4 mr-1.5" />
            <span>Tra cứu Chứng chỉ</span>
          </Button>
        </form>
      </div>

      {isValid && cert ? (
        <div className="space-y-6">
          {/* Status Verification Banner */}
          <div className="bg-success/10 border border-success/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-success">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-success text-success-foreground flex items-center justify-center font-bold shrink-0">
                <Check aria-hidden="true" className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm">Chứng chỉ Xác minh Chính thức</div>
                <p className="text-xs opacity-90">
                  Chứng chỉ này hoàn toàn hợp lệ và được lưu trữ trên hệ thống LMS AI Platform. (#
                  {cert.certificateId})
                </p>
              </div>
            </div>
          </div>

          {/* Synchronized Diploma Canvas */}
          <CertificateDocument cert={cert} />

          {/* Clean Export & Share Actions Bar */}
          <div className="bg-card border border-border rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <p className="text-xs text-muted-foreground text-center sm:text-left">
              Xuất bản in khổ ngang chuẩn A4 hoặc tải chứng thực OpenBadges 3.0 để đính kèm hồ sơ.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0">
              <Button type="button" variant="outlined" size="sm" onClick={handleShareCertificate}>
                <Share2 aria-hidden="true" className="w-4 h-4 mr-1.5" />
                <span>Chia sẻ Chứng chỉ</span>
              </Button>
              <Button type="button" variant="outlined" size="sm" onClick={handleDownloadBadge}>
                <Download aria-hidden="true" className="w-4 h-4 mr-1.5" />
                <span>Tải huy hiệu (JSON)</span>
              </Button>
              <Button type="button" size="sm" onClick={handleDownloadPdf} disabled={downloadingPdf}>
                <FileDown aria-hidden="true" className="w-4 h-4 mr-1.5" />
                <span>{downloadingPdf ? "Đang tạo PDF…" : "Tải chứng chỉ (PDF)"}</span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-destructive/10 border border-destructive/20 rounded-3xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center font-bold text-xl mx-auto">
            <X aria-hidden="true" className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-destructive">Không thể Xác minh Chứng chỉ</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {statusMsg || `Không tìm thấy chứng chỉ với mã đã nhập #${certId}`}
          </p>
          <Button
            type="button"
            onClick={() => {
              setSearchCertId("CERT-DEMO12345");
              router.push("/verify/CERT-DEMO12345");
            }}
          >
            Demo Code: CERT-DEMO12345
          </Button>
        </div>
      )}
    </main>
  );
}
