"use client";

import { AlignLeft, FileText, MessageSquare, Clock } from "lucide-react";
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
        <button
          type="button"
          onClick={() => onTabClick("transcript")}
          className="group flex flex-col items-center gap-1 cursor-pointer select-none bg-transparent border-0 p-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-xl transition-transform active:scale-95"
          title="Phụ đề"
          aria-label="Xem Phụ đề Tương tác"
        >
          <div
            className={`w-12 h-7 rounded-full flex items-center justify-center transition-colors duration-200 ${
              isPanelOpen && activeTab === "transcript"
                ? "bg-primary-container text-on-primary-container font-bold"
                : "text-on-surface-variant group-hover:bg-surface-container-high group-hover:text-on-surface"
            }`}
          >
            <AlignLeft className="w-4 h-4" aria-hidden="true" />
          </div>
          <span
            className={`text-xs tracking-tight leading-none transition-colors ${
              isPanelOpen && activeTab === "transcript"
                ? "text-primary font-bold"
                : "text-on-surface-variant group-hover:text-on-surface"
            }`}
          >
            Phụ đề
          </span>
        </button>
      )}

      {!isPreviewMode && (
        <>
          {/* Notes Button: For Video & Reading Lecture Items */}
          {isLectureItem && (
            <button
              type="button"
              onClick={() => onTabClick("notes")}
              className="group flex flex-col items-center gap-1 cursor-pointer select-none bg-transparent border-0 p-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-xl transition-transform active:scale-95"
              title="Ghi chú"
              aria-label="Xem Ghi chú Cá nhân"
            >
              <div
                className={`w-12 h-7 rounded-full flex items-center justify-center transition-colors duration-200 ${
                  isPanelOpen && activeTab === "notes"
                    ? "bg-primary-container text-on-primary-container font-bold"
                    : "text-on-surface-variant group-hover:bg-surface-container-high group-hover:text-on-surface"
                }`}
              >
                <FileText className="w-4 h-4" aria-hidden="true" />
              </div>
              <span
                className={`text-[10px] tracking-tight leading-none transition-colors ${
                  isPanelOpen && activeTab === "notes"
                    ? "text-primary font-bold"
                    : "text-on-surface-variant group-hover:text-on-surface"
                }`}
              >
                Ghi chú
              </span>
            </button>
          )}

          {/* Forum Button: For Video & Reading Lecture Items */}
          {isLectureItem && (
            <button
              type="button"
              onClick={() => onTabClick("forum")}
              className="group flex flex-col items-center gap-1 cursor-pointer select-none bg-transparent border-0 p-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-xl transition-transform active:scale-95"
              title="Thảo luận"
              aria-label="Mở Thảo luận Bài học"
            >
              <div
                className={`w-12 h-7 rounded-full flex items-center justify-center transition-colors duration-200 ${
                  isPanelOpen && activeTab === "forum"
                    ? "bg-primary-container text-on-primary-container font-bold"
                    : "text-on-surface-variant group-hover:bg-surface-container-high group-hover:text-on-surface"
                }`}
              >
                <MessageSquare className="w-4 h-4" aria-hidden="true" />
              </div>
              <span
                className={`text-[10px] tracking-tight leading-none transition-colors ${
                  isPanelOpen && activeTab === "forum"
                    ? "text-primary font-bold"
                    : "text-on-surface-variant group-hover:text-on-surface"
                }`}
              >
                Thảo luận
              </span>
            </button>
          )}

          {/* Deadlines Button */}
          <button
            type="button"
            onClick={() => onTabClick("deadlines")}
            className="group flex flex-col items-center gap-1 cursor-pointer select-none bg-transparent border-0 p-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-xl transition-transform active:scale-95"
            title="Deadlines"
            aria-label="Xem Deadlines & Tiến độ"
          >
            <div
              className={`w-12 h-7 rounded-full flex items-center justify-center transition-colors duration-200 ${
                isPanelOpen && activeTab === "deadlines"
                  ? "bg-primary-container text-on-primary-container font-bold"
                  : "text-on-surface-variant group-hover:bg-surface-container-high group-hover:text-on-surface"
              }`}
            >
              <Clock className="w-4 h-4" aria-hidden="true" />
            </div>
            <span
              className={`text-[10px] tracking-tight leading-none transition-colors ${
                isPanelOpen && activeTab === "deadlines"
                  ? "text-primary font-bold"
                  : "text-on-surface-variant group-hover:text-on-surface"
              }`}
            >
              Deadlines
            </span>
          </button>
        </>
      )}
    </div>
  );
}
