function extractFilenameFromHeader(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) return fallback;
  const match = /filename="?([^";\n]+)"?/i.exec(contentDisposition);
  const sanitized = match?.[1]?.trim().replace(/[/\\]/g, "");
  return sanitized || fallback;
}

export async function downloadCertificatePdf(certificateId: string): Promise<void> {
  const cleanId = certificateId.trim();
  const url = `/api/v1/certificates/${encodeURIComponent(cleanId)}/pdf?download=1`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    let errorMessage = "Không thể tải bản PDF chứng chỉ. Vui lòng thử lại.";
    try {
      const data = (await response.json()) as { detail?: string };
      if (data?.detail) {
        errorMessage = data.detail;
      }
    } catch {
      // Non-JSON error response; keep default Vietnamese message
    }
    throw new Error(errorMessage);
  }

  const blob = await response.blob();
  if (blob.size === 0 || (blob.type && !blob.type.includes("pdf"))) {
    throw new Error("Tệp PDF chứng chỉ không hợp lệ. Vui lòng thử lại.");
  }

  const filename = extractFilenameFromHeader(
    response.headers.get("content-disposition"),
    `Chung-chi-${cleanId}.pdf`,
  );

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
