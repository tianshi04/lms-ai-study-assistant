"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { downloadCertificatePdf } from "@/lib/certificate_pdf";

export function useDownloadCertificatePdf() {
  const toast = useToast();
  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null);

  const downloadPdf = useCallback(
    async (certificateId: string) => {
      if (!certificateId || downloadingCertId !== null) return;
      setDownloadingCertId(certificateId);
      try {
        await downloadCertificatePdf(certificateId);
        toast.success("Đã tải xuống chứng chỉ PDF thành công!");
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Không thể tải bản PDF chứng chỉ. Vui lòng thử lại.";
        toast.error(message);
      } finally {
        setDownloadingCertId(null);
      }
    },
    [downloadingCertId, toast],
  );

  return { downloadingCertId, downloadPdf };
}
