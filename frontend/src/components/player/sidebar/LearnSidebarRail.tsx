"use client";

import { AlignLeft, FileText, MessageSquare, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { SidebarTab } from "./types";

interface LearnSidebarRailProps {
  activeTab: SidebarTab;
  isPanelOpen: boolean;
  isVideoItem: boolean;
  isLectureItem: boolean;
  isPreviewMode: boolean;
  onTabClick: (tab: SidebarTab) => void;
}

export function LearnSidebarRail({
  activeTab,
  isPanelOpen,
  isVideoItem,
  isLectureItem,
  isPreviewMode,
  onTabClick,
}: LearnSidebarRailProps) {
  return (
    <div className="absolute top-0 bottom-0 right-0 w-16 lg:w-20 bg-surface-container-low flex flex-col items-center justify-start py-5 gap-5 select-none rounded-3xl z-0">
      {/* Transcript Button: Only for Video Items */}
      {isVideoItem && (
        <Button
          type="button"
          variant="text"
          onClick={() => onTabClick("transcript")}
          className="group flex flex-col items-center gap-1 h-auto p-0 hover:bg-transparent shadow-none"
          title="Phụ đề"
          aria-label="Xem Phụ đề Tương tác"
        >
          <div
            className={`w-12 h-7 rounded-full flex items-center justify-center transition-colors ${
              isPanelOpen && activeTab === "transcript"
                ? "bg-primary-container text-on-primary-container font-bold"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            }`}
          >
            <AlignLeft className="w-4 h-4" aria-hidden="true" />
          </div>
          <span
            className={`text-xs tracking-tight leading-none ${
              isPanelOpen && activeTab === "transcript"
                ? "text-primary font-bold"
                : "text-on-surface-variant"
            }`}
          >
            Phụ đề
          </span>
        </Button>
      )}

      {!isPreviewMode && (
        <>
          {/* Notes Button: For Video & Reading Lecture Items */}
          {isLectureItem && (
            <Button
              type="button"
              variant="text"
              onClick={() => onTabClick("notes")}
              className="group flex flex-col items-center gap-1 h-auto p-0 hover:bg-transparent shadow-none"
              title="Ghi chú"
              aria-label="Xem Ghi chú Cá nhân"
            >
              <div
                className={`w-12 h-7 rounded-full flex items-center justify-center transition-colors ${
                  isPanelOpen && activeTab === "notes"
                    ? "bg-primary-container text-on-primary-container font-bold"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                }`}
              >
                <FileText className="w-4 h-4" aria-hidden="true" />
              </div>
              <span
                className={`text-[10px] tracking-tight leading-none ${
                  isPanelOpen && activeTab === "notes"
                    ? "text-primary font-bold"
                    : "text-on-surface-variant"
                }`}
              >
                Ghi chú
              </span>
            </Button>
          )}

          {/* Forum Button: For Video & Reading Lecture Items */}
          {isLectureItem && (
            <Button
              type="button"
              variant="text"
              onClick={() => onTabClick("forum")}
              className="group flex flex-col items-center gap-1 h-auto p-0 hover:bg-transparent shadow-none"
              title="Thảo luận"
              aria-label="Mở Thảo luận Bài học"
            >
              <div
                className={`w-12 h-7 rounded-full flex items-center justify-center transition-colors ${
                  isPanelOpen && activeTab === "forum"
                    ? "bg-primary-container text-on-primary-container font-bold"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                }`}
              >
                <MessageSquare className="w-4 h-4" aria-hidden="true" />
              </div>
              <span
                className={`text-[10px] tracking-tight leading-none ${
                  isPanelOpen && activeTab === "forum"
                    ? "text-primary font-bold"
                    : "text-on-surface-variant"
                }`}
              >
                Thảo luận
              </span>
            </Button>
          )}

          {/* Deadlines Button */}
          <Button
            type="button"
            variant="text"
            onClick={() => onTabClick("deadlines")}
            className="group flex flex-col items-center gap-1 h-auto p-0 hover:bg-transparent shadow-none"
            title="Deadlines"
            aria-label="Xem Deadlines & Tiến độ"
          >
            <div
              className={`w-12 h-7 rounded-full flex items-center justify-center transition-colors ${
                isPanelOpen && activeTab === "deadlines"
                  ? "bg-primary-container text-on-primary-container font-bold"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
            >
              <Clock className="w-4 h-4" aria-hidden="true" />
            </div>
            <span
              className={`text-[10px] tracking-tight leading-none ${
                isPanelOpen && activeTab === "deadlines"
                  ? "text-primary font-bold"
                  : "text-on-surface-variant"
              }`}
            >
              Deadlines
            </span>
          </Button>
        </>
      )}
    </div>
  );
}
