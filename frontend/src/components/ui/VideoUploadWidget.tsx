"use client";

import React, { useState, useRef } from "react";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
import { useToast } from "@/components/ui/Toast";

interface VideoUploadWidgetProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  accept?: string;
  label?: string;
  placeholder?: string;
}

export function VideoUploadWidget({
  value,
  onChange,
  folder = "videos",
  accept = "video/mp4,video/webm,video/quicktime",
  label = "Đường dẫn hoặc Upload Tệp Video",
  placeholder = "https://...",
}: VideoUploadWidgetProps) {
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
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
          {label}
        </label>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === "upload"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Upload Tải lên
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === "url"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Nhập Đường dẫn URL
          </button>
        </div>
      </div>

      {activeTab === "upload" ? (
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
            className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              dragOver
                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 scale-[1.01]"
                : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 hover:border-blue-400"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />

            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 border border-blue-200 dark:border-blue-500/20 shadow-xs">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>

            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Kéo & thả tệp Video/Phụ đề vào đây hoặc{" "}
              <span className="text-blue-600 dark:text-blue-400 underline">bấm để chọn tệp</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              Hỗ trợ tệp MP4, WebM, MOV, VTT (Max 500MB)
            </p>
          </div>

          {isUploading && (
            <div className="space-y-1 bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200 dark:border-blue-900/50">
              <div className="flex justify-between text-xs font-semibold text-blue-700 dark:text-blue-300">
                <span>Đang tải tệp lên Cloud Storage...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono"
          />
        </div>
      )}

      {value && (
        <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-hidden text-xs">
            <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[10px] uppercase tracking-wider shrink-0">
              Video Đang Chọn
            </span>
            <span className="font-mono text-slate-700 dark:text-slate-300 truncate font-semibold">
              {value}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold shrink-0 cursor-pointer"
          >
            Gỡ bỏ Video
          </button>
        </div>
      )}
    </div>
  );
}
