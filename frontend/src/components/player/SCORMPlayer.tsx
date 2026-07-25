"use client";

import { useEffect, useState } from "react";
import { getRpcClient } from "@/lib/connect_client";
import { LearningService } from "@/gen/learning/v1/learning_pb";
import type { LearningItem } from "@/gen/catalog/v1/catalog_pb";
import { useToast } from "@/components/ui/Toast";

interface SCORMPlayerProps {
  activeItem: LearningItem;
  userId?: string;
  onComplete: () => void;
}

interface SCORMTrackingState {
  cmi_core_lesson_status: string;
  cmi_core_score_raw: number;
  cmi_core_session_time: string;
  cmi_core_lesson_location: string;
  cmi_suspend_data: string;
}

export function SCORMPlayer({ activeItem, userId, onComplete }: SCORMPlayerProps) {
  const toast = useToast();

  const [trackingState, setTrackingState] = useState<SCORMTrackingState>({
    cmi_core_lesson_status: "not attempted",
    cmi_core_score_raw: 0,
    cmi_core_session_time: "00:00:00",
    cmi_core_lesson_location: "",
    cmi_suspend_data: "",
  });

  const [loading, setLoading] = useState(true);

  // 1. Fetch initial SCORM tracking on load
  useEffect(() => {
    async function fetchTracking() {
      try {
        const client = getRpcClient(LearningService);
        const res = await client.getScormTracking({ itemId: activeItem.id });
        if (res.tracking) {
          setTrackingState({
            cmi_core_lesson_status: res.tracking.cmiCoreLessonStatus || "not attempted",
            cmi_core_score_raw: res.tracking.cmiCoreScoreRaw || 0,
            cmi_core_session_time: res.tracking.cmiCoreSessionTime || "00:00:00",
            cmi_core_lesson_location: res.tracking.cmiCoreLessonLocation || "",
            cmi_suspend_data: res.tracking.cmiSuspendData || "",
          });
        }
      } catch (err) {
        console.warn("Failed to load initial SCORM tracking:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTracking();
  }, [activeItem.id]);

  // 2. Register SCORM 1.2 API Bridge in the parent window context
  useEffect(() => {
    if (loading) return;

    const saveTrackingState = async (state: SCORMTrackingState) => {
      try {
        const client = getRpcClient(LearningService);
        await client.saveScormTracking({
          itemId: activeItem.id,
          cmiCoreLessonStatus: state.cmi_core_lesson_status,
          cmiCoreScoreRaw: state.cmi_core_score_raw,
          cmiCoreSessionTime: state.cmi_core_session_time,
          cmiCoreLessonLocation: state.cmi_core_lesson_location,
          cmiSuspendData: state.cmi_suspend_data,
        });
      } catch (err) {
        console.error("Failed to save SCORM progress:", err);
      }
    };

    // Construct SCORM API Object
    const scormApi = {
      LMSInitialize: (param: string) => {
        console.log("SCORM: LMSInitialize", param);
        return "true";
      },
      LMSFinish: (param: string) => {
        console.log("SCORM: LMSFinish", param);
        return "true";
      },
      LMSGetValue: (element: string) => {
        console.log("SCORM: LMSGetValue", element);
        if (element === "cmi.core.lesson_status") return trackingState.cmi_core_lesson_status;
        if (element === "cmi.core.score.raw") return String(trackingState.cmi_core_score_raw);
        if (element === "cmi.core.lesson_location") return trackingState.cmi_core_lesson_location;
        if (element === "cmi.suspend_data") return trackingState.cmi_suspend_data;
        if (element === "cmi.core.session_time") return trackingState.cmi_core_session_time;
        return "";
      },
      LMSSetValue: (element: string, value: string) => {
        console.log("SCORM: LMSSetValue", element, value);
        const updated = { ...trackingState };

        if (element === "cmi.core.lesson_status") {
          updated.cmi_core_lesson_status = value;
          if (value === "completed" || value === "passed") {
            toast.success("Học liệu tương tác SCORM đã hoàn thành!");
            onComplete();
          }
        } else if (element === "cmi.core.score.raw") {
          updated.cmi_core_score_raw = Math.round(parseFloat(value) || 0);
        } else if (element === "cmi.core.lesson_location") {
          updated.cmi_core_lesson_location = value;
        } else if (element === "cmi.suspend_data") {
          updated.cmi_suspend_data = value;
        } else if (element === "cmi.core.session_time") {
          updated.cmi_core_session_time = value;
        }

        setTrackingState(updated);
        saveTrackingState(updated);
        return "true";
      },
      LMSCommit: (param: string) => {
        console.log("SCORM: LMSCommit", param);
        return "true";
      },
      LMSGetLastError: () => 0,
      LMSGetErrorString: (errorCode: number) => "No error",
      LMSGetDiagnostic: (errorCode: number) => "No diagnostic info",
    };

    // Bind to parent window context
    (window as any).API = scormApi;

    return () => {
      delete (window as any).API;
    };
  }, [loading, trackingState, activeItem.id, onComplete]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white gap-3">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold">Đang chuẩn bị gói tương tác SCORM...</span>
      </div>
    );
  }

  // Construct iframe source URL targeting the public MinIO bucket assets
  const scormUrl = `http://localhost:9000/coursera-assets/${activeItem.scormPackagePath}/${activeItem.scormEntryHtml}`;

  return (
    <div className="w-full h-full bg-slate-950 flex flex-col relative">
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 text-xs flex items-center justify-between text-slate-400">
        <span className="font-semibold text-slate-200">Interactive SCO Canvas: {activeItem.title}</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${trackingState.cmi_core_lesson_status === "completed" || trackingState.cmi_core_lesson_status === "passed" ? "bg-emerald-500" : "bg-amber-500"}`} />
            Trạng thái: <strong className="uppercase">{trackingState.cmi_core_lesson_status}</strong>
          </span>
          {trackingState.cmi_core_score_raw > 0 && (
            <span>Điểm: <strong>{trackingState.cmi_core_score_raw}</strong></span>
          )}
        </div>
      </div>
      <iframe
        src={scormUrl}
        className="w-full flex-1 border-none bg-white"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-view"
        allowFullScreen
      />
    </div>
  );
}
