"use client";

import { X, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { SidebarTab } from "./types";

interface LearnSidebarHeaderProps {
  activeTab: SidebarTab;
  isAiSupported: boolean;
  onNewChat: () => void;
  onClose: () => void;
}

export function LearnSidebarHeader({
  activeTab,
  isAiSupported,
  onNewChat,
  onClose,
}: LearnSidebarHeaderProps) {
  const isAiActive = activeTab === "ai_assistant";

  return (
    <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1">
      {/* New Chat Button: Smoothly appears in AI mode */}
      {isAiSupported && isAiActive && (
        <Button
          type="button"
          variant="text"
          iconOnly
          onClick={onNewChat}
          className="w-7 h-7 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-full animate-in fade-in duration-200"
          title="Tạo cuộc trò chuyện mới"
          aria-label="Tạo cuộc trò chuyện mới"
        >
          <MessageSquarePlus className="w-4 h-4" aria-hidden="true" />
        </Button>
      )}

      {/* Morphing Gliding Close (X) Button */}
      <Button
        type="button"
        variant="text"
        iconOnly
        onClick={onClose}
        className="w-7 h-7 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-full"
        title={isAiActive ? "Đóng Trợ lý AI" : "Đóng bảng công cụ"}
        aria-label={isAiActive ? "Đóng Trợ lý AI" : "Đóng bảng công cụ"}
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
