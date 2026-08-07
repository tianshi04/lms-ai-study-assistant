"use client";

import React, { useState, useRef } from "react";
import { Upload, CheckCircle2 } from "lucide-react";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
import { useToast } from "@/components/ui/Toast";
import { Input } from "@/components/ui/Input";

interface VideoUploadWidgetProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  accept?: string;
  label?: string;
  placeholder?: string;
  compact?: boolean;
  dropText?: string;
  fileTypesHint?: string;
}

export function VideoUploadWidget({
  value,
  onChange,
  folder = "videos",
  accept = "video/mp4,video/webm,video/quicktime",
  label = "Đường dẫn hoặc Upload Video",
  placeholder = "https://…",
  compact = false,
  dropText,
  fileTypesHint,
}: VideoUploadWidgetProps) {
  const isSubtitle = folder === "subtitles" || accept.includes("vtt");
  const defaultDropText = isSubtitle
    ? "Kéo & thả tệp Phụ đề vào đây hoặc"
    : "Kéo & thả tệp Video vào đây hoặc";
  const defaultFileTypesHint = isSubtitle
    ? "Hỗ trợ tệp .VTT (Max 500MB)"
    : "Hỗ trợ tệp MP4, WebM, MOV (Max 500MB)";
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (file.size > 500 * 1024 * 1024) {
      toast.error("Dung lượng tệp vượt quá giới hạn cho phép (Max 500MB).");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const client = getRpcClient(CatalogService);

      const res = await client.generateUploadUrl({
        filename: file.name,
        contentType: file.type || "video/mp4",
        folder: folder,
      });

      setUploadProgress(30);

      let uploadSuccess = false;
      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", res.uploadUrl, true);
          xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

          // Timeout: if Docker port forwarding is broken (common on WSL2/Windows),
          // the presigned PUT will hang forever. Auto-abort after 8s to trigger fallback.
          xhr.timeout = 8000;
          xhr.ontimeout = () =>
            reject(new Error("Presigned PUT timed out (MinIO port unreachable)"));

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percent = Math.round(30 + (e.loaded / e.total) * 60);
              setUploadProgress(percent);
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
        setUploadProgress(50);
        const arrayBuffer = await file.arrayBuffer();
        const byteRes = await client.uploadMediaFile({
          filename: file.name,
          contentType: file.type || "video/mp4",
          fileBytes: new Uint8Array(arrayBuffer),
          folder: folder,
        });
        finalUrl = byteRes.fileUrl;
      }

      setUploadProgress(100);
      onChange(finalUrl);
      toast.success(`Đã tải lên tệp "${file.name}" thành công!`);
    } catch (err: unknown) {
      console.error("Failed to upload video:", err);
      const msg = err instanceof Error ? err.message : "Tải tệp video thất bại";
      toast.error(msg);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        aria-label="Tải lên tệp video hoặc phụ đề"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
          // Reset value so selecting the exact same file again will trigger onChange
          e.target.value = "";
        }}
      />

      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
        <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === "upload"
                ? "bg-card text-primary shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Upload Tải lên
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === "url"
                ? "bg-card text-primary shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Nhập Đường dẫn URL
          </button>
        </div>
      </div>

      {value && !isUploading ? (
        <div className="p-3 rounded-2xl bg-success/10 border border-success/30 flex items-center justify-between gap-3 animate-in fade-in duration-m3-short-3 ease-m3-decelerate shadow-2xs">
          <div className="flex items-center gap-2.5 overflow-hidden text-xs min-w-0">
            <div className="w-8 h-8 rounded-xl bg-success/20 text-success flex items-center justify-center shrink-0 border border-success/30">
              <CheckCircle2 className="w-4.5 h-4.5" aria-hidden="true" />
            </div>
            <div className="overflow-hidden min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-success text-success-foreground font-bold text-[10px] uppercase tracking-wider shrink-0">
                  {isSubtitle ? "Đã chọn Phụ đề" : "Đã chọn Video"}
                </span>
                <span className="font-mono text-foreground text-xs min-w-0 truncate font-semibold">
                  {value.split("/").pop() || value}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono min-w-0 truncate mt-0.5">
                {value}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (activeTab === "upload") {
                  fileInputRef.current?.click();
                } else {
                  onChange("");
                }
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-card text-foreground hover:bg-muted border border-border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Thay đổi
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Gỡ bỏ
            </button>
          </div>
        </div>
      ) : activeTab === "upload" ? (
        <div className="space-y-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileSelect(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
              compact ? "p-3 sm:p-4" : "p-6"
            } ${
              dragOver
                ? "border-primary bg-primary/10 scale-[1.01]"
                : "border-border bg-card hover:border-primary"
            }`}
          >
            <div
              className={`rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs ${
                compact ? "w-8 h-8 mb-2" : "w-12 h-12 mb-3"
              }`}
            >
              <Upload aria-hidden="true" className={compact ? "w-4 h-4" : "w-6 h-6"} />
            </div>

            <p className="text-xs font-bold text-foreground">
              {dropText || defaultDropText}{" "}
              <span className="text-primary underline">bấm để chọn tệp</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
              {fileTypesHint || defaultFileTypesHint}
            </p>
          </div>

          {isUploading && (
            <div className="space-y-1 bg-primary/10 p-3 rounded-xl border border-primary/20">
              <div className="flex justify-between text-xs font-semibold text-primary">
                <span aria-live="polite">Đang tải tệp lên Cloud Storage…</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-secondary-container rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-colors duration-m3-medium-2 ease-m3-emphasized rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            aria-label="Đường dẫn URL media"
            spellCheck={false}
            className="font-mono"
          />
        </div>
      )}
    </div>
  );
}
