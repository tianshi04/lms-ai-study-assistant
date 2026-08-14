"use client";

import { useState } from "react";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService, type Course } from "@/gen/catalog/v1/catalog_pb";
import { useToast } from "@/components/ui/Toast";

export function useScormActions(courseId: string) {
  const [showScormReviewModal, setShowScormReviewModal] = useState(false);
  const [scormPreviewCourse, setScormPreviewCourse] = useState<Course | null>(null);
  const [scormObjectKey, setScormObjectKey] = useState("");
  const [scormImporting, setScormImporting] = useState(false);
  const [exportingScorm, setExportingScorm] = useState(false);

  const toast = useToast();

  const handleExportScorm = async () => {
    try {
      setExportingScorm(true);
      const client = getRpcClient(CatalogService);
      const res = await client.exportCourseToScorm({ courseId });
      if (res.downloadUrl) {
        toast.success("Đã đóng gói khóa học thành SCORM 1.2 ZIP!");
        window.open(res.downloadUrl, "_blank");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xuất SCORM thất bại.";
      toast.error(msg);
    } finally {
      setExportingScorm(false);
    }
  };

  const handleImportScormFile = async (file: File) => {
    try {
      setScormImporting(true);
      toast.info("Đang tải gói SCORM lên hệ thống lưu trữ…");
      const client = getRpcClient(CatalogService);

      const uploadRes = await client.generateUploadUrl({
        filename: file.name,
        contentType: "application/zip",
        folder: "scorm",
      });

      let uploadedKey = uploadRes.objectKey;
      let uploadSuccess = false;

      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", uploadRes.uploadUrl, true);
          xhr.setRequestHeader("Content-Type", "application/zip");
          xhr.timeout = 10000;
          xhr.ontimeout = () => reject(new Error("Timeout upload"));
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Status ${xhr.status}`));
          };
          xhr.onerror = () => reject(new Error("Network error"));
          xhr.send(file);
        });
        uploadSuccess = true;
      } catch (err) {
        console.warn("Direct upload failed, fallback to byte upload:", err);
      }

      if (!uploadSuccess) {
        const arrayBuffer = await file.arrayBuffer();
        const byteRes = await client.uploadMediaFile({
          filename: file.name,
          contentType: "application/zip",
          fileBytes: new Uint8Array(arrayBuffer),
          folder: "scorm",
        });
        uploadedKey = byteRes.objectKey;
      }

      toast.info("Đang phân tích cấu trúc gói SCORM…");
      const parseRes = await client.parseScormPackage({
        scormObjectKey: uploadedKey,
      });

      setScormObjectKey(uploadedKey);
      setScormPreviewCourse(parseRes.coursePreview || null);
      setShowScormReviewModal(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể phân tích gói SCORM.";
      toast.error(msg);
    } finally {
      setScormImporting(false);
    }
  };

  return {
    showScormReviewModal,
    setShowScormReviewModal,
    scormPreviewCourse,
    scormObjectKey,
    scormImporting,
    exportingScorm,
    handleExportScorm,
    handleImportScormFile,
  };
}
