"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useScormTrackingQuery, useSaveScormTrackingMutation } from "@/lib/query_hooks";
import { ScormAPIAdapter } from "@/lib/ScormAPIAdapter";

interface ScormPlayerProps {
  itemId: string;
  scormEntryHtml: string;
  scormPackagePath: string;
  onComplete?: () => void;
}

export function ScormPlayer({
  itemId,
  scormEntryHtml,
  scormPackagePath,
  onComplete,
}: ScormPlayerProps) {
  const params = useParams();
  const courseId = params?.courseId as string;

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [adapterInitialized, setAdapterInitialized] = useState(false);

  // Load initial SCORM tracking data
  const { data: initialCmi, isLoading, refetch } = useScormTrackingQuery(courseId, itemId);
  const saveMutation = useSaveScormTrackingMutation();

  // Handle saving cmiData to the backend
  const handleSave = useCallback(async (cmiData: Record<string, string>) => {
    try {
      await saveMutation.mutateAsync({
        courseId,
        itemId,
        cmiData,
      });
      console.log("SCORM tracking saved to backend successfully.");
    } catch (err) {
      console.error("Failed to save SCORM tracking data:", err);
    }
  }, [courseId, itemId, saveMutation]);

  const handleComplete = useCallback(() => {
    console.log("SCORM completion criteria satisfied. Invoking onComplete callback.");
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    if (isLoading || !initialCmi) return;

    // Instantiate and bind SCORM API adapters to window
    const adapter = new ScormAPIAdapter(initialCmi, handleSave, handleComplete);

    // Cast as any to set custom global properties on window
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    win.API = adapter.getAPI12();
    win.API_1484_11 = adapter.getAPI2004();

    console.log("Attached SCORM 1.2 & 2004 APIs to window context.");
    
    const timer = setTimeout(() => {
      setAdapterInitialized(true);
    }, 0);

    return () => {
      clearTimeout(timer);
      // Clean up global window bindings on unmount
      delete win.API;
      delete win.API_1484_11;
      console.log("Removed SCORM API bindings from window context.");
    };
  }, [isLoading, initialCmi, handleSave, handleComplete]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400 mb-3"></div>
        <p className="text-xs font-semibold">Đang tải gói học liệu SCORM...</p>
      </div>
    );
  }

  // Construct iframe proxy URL matching rewrites: /scorm-content/scorm/packages/{itemId}/{scormEntryHtml}
  const iframeSrc = `/scorm-content/${scormPackagePath}/${scormEntryHtml}`;

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
      {/* SCORM Top Header status banner */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 transition-colors duration-200">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-orange-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Học liệu chuẩn SCORM</span>
        </div>
        <div className="flex items-center gap-3">
          {saveMutation.isPending && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 animate-pulse">
              Đang đồng bộ tiến trình...
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
          >
            Tải lại dữ liệu
          </button>
        </div>
      </div>

      {/* Main player workspace */}
      <div className="flex-1 w-full bg-slate-900 relative">
        {adapterInitialized ? (
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            className="w-full h-full border-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400">
            Khởi tạo môi trường SCORM API...
          </div>
        )}
      </div>
    </div>
  );
}
