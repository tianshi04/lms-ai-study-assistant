"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Loader2, Upload, X } from "lucide-react";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
import { getRpcClient } from "@/lib/connect_client";
import { Button } from "@/components/ui/Button";
import { LinearProgress } from "@/components/ui/Progress";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const MAX_SIGNATURE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

interface SignatureUploadFieldProps {
  id?: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  compact?: boolean;
  className?: string;
}

export function SignatureUploadField({
  id,
  value,
  onChange,
  folder = "public/signatures",
  compact = false,
  className,
}: SignatureUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      toast.error("Vui lòng chọn tệp ảnh định dạng PNG, JPG, WebP hoặc SVG.");
      return;
    }

    if (file.size > MAX_SIGNATURE_SIZE_BYTES) {
      toast.error("Dung lượng ảnh chữ ký tối đa 5MB.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);

    try {
      const client = getRpcClient(CatalogService);
      const contentType = file.type || "image/png";

      const res = await client.generateUploadUrl({
        filename: file.name,
        contentType,
        folder,
      });

      setUploadProgress(35);

      let uploadSuccess = false;
      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", res.uploadUrl, true);
          xhr.setRequestHeader("Content-Type", contentType);
          xhr.timeout = 8000;
          xhr.ontimeout = () => reject(new Error("Presigned PUT timed out"));

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round(35 + (e.loaded / e.total) * 55));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Presigned PUT status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error("Network error during presigned PUT upload"));
          xhr.send(file);
        });
        uploadSuccess = true;
      } catch (err) {
        console.warn("Direct presigned PUT upload failed, switching to byte RPC fallback:", err);
      }

      let finalUrl = res.fileUrl;
      if (!uploadSuccess) {
        setUploadProgress(60);
        const arrayBuffer = await file.arrayBuffer();
        const byteRes = await client.uploadMediaFile({
          filename: file.name,
          contentType,
          fileBytes: new Uint8Array(arrayBuffer),
          folder,
        });
        finalUrl = byteRes.fileUrl;
      }

      setUploadProgress(100);
      onChange(finalUrl);
      toast.success(`Đã tải lên ảnh chữ ký "${file.name}" thành công!`);
    } catch (err: unknown) {
      console.error("Failed to upload signature image:", err);
      toast.error(err instanceof Error ? err.message : "Tải ảnh chữ ký thất bại.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input
        id={id}
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFileSelect(file);
          e.target.value = "";
        }}
      />

      {compact ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outlined"
            size="sm"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 justify-center whitespace-nowrap"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Đang tải...</span>
              </>
            ) : value ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-success" aria-hidden="true" />
                <span>Đổi ảnh chữ ký</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" aria-hidden="true" />
                <span>Tải ảnh chữ ký</span>
              </>
            )}
          </Button>
          {value && !isUploading && (
            <Button
              type="button"
              variant="text"
              size="sm"
              onClick={() => onChange("")}
              aria-label="Xóa ảnh chữ ký"
              className="px-2 text-muted-foreground hover:text-destructive shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      ) : value ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-container/50 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium text-foreground truncate">
              Đã tải lên ảnh chữ ký
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outlined"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>Đổi ảnh</span>
            </Button>
            <Button
              type="button"
              variant="text"
              size="sm"
              disabled={isUploading}
              onClick={() => onChange("")}
              aria-label="Xóa ảnh chữ ký"
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void handleFileSelect(file);
          }}
          className={cn(
            "w-full rounded-2xl border-2 border-dashed px-4 py-5 text-center transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/50",
            isUploading && "opacity-60 cursor-not-allowed",
          )}
        >
          <div className="flex flex-col items-center gap-1.5">
            {isUploading ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
            )}
            <span className="text-sm font-medium text-foreground">
              {isUploading ? "Đang tải ảnh chữ ký lên..." : "Nhấn để chọn hoặc kéo thả ảnh chữ ký"}
            </span>
            <span className="text-xs text-muted-foreground">
              Hỗ trợ PNG, JPG, WebP hoặc SVG (tối đa 5MB)
            </span>
          </div>
        </button>
      )}

      {isUploading && <LinearProgress value={uploadProgress} className="h-1.5" />}
    </div>
  );
}
