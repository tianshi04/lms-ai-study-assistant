"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useFrontendTool,
  useAgentContext,
  useAgent,
  useCopilotKit,
} from "@copilotkit/react-core/v2";
import { z } from "zod";
import { Sparkles, MessageSquarePlus, X, ArrowUp } from "lucide-react";
import type { PersonalNote } from "@/gen/learning/v1/learning_pb";
import type { LearningItem } from "@/gen/catalog/v1/catalog_pb";
import { formatTime, getItemTypeName } from "./utils";
import { getMessageText } from "@/components/ai/utils";
import { Chip } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { SaveNoteCard, TimestampSeekCard } from "./AIChatToolCards";
import { renderMessageItem } from "./AIChatMessageItem";
import { Progress } from "@/components/ui/Progress";

interface LearnPageAIChatbotProps {
  courseId: string;
  courseTitle: string;
  moduleTitle?: string;
  activeItem: LearningItem | null;
  currentTime: number;
  transcriptText?: string;
  readingMarkdown?: string;
  externalPrompt?: string | null;
  onPromptConsumed?: () => void;
  onSeek: (seconds: number) => void;
  onNextLesson?: () => void;
  onNoteCreated?: (note: PersonalNote) => void;
  onClose?: () => void;
}

export function LearnPageAIChatbot({
  courseId,
  courseTitle,
  moduleTitle = "Bài học hiện tại",
  activeItem,
  currentTime,
  transcriptText = "",
  readingMarkdown = "",
  externalPrompt = null,
  onPromptConsumed,
  onSeek,
  onNextLesson,
  onNoteCreated,
  onClose,
}: LearnPageAIChatbotProps) {
  const [inputValue, setInputValue] = useState("");
  const [sessionStartIndex, setSessionStartIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { agent } = useAgent({ agentId: "learnAgent" });
  const { copilotkit } = useCopilotKit();

  // Filter messages for current chat session
  const displayMessages = useMemo(() => {
    if (!agent?.messages) return [];
    return agent.messages.slice(sessionStartIndex);
  }, [agent?.messages, sessionStartIndex]);

  // Thinking indicator should ONLY show before AI emits its response text
  const showThinkingIndicator = useMemo(() => {
    if (!agent?.isRunning) return false;
    if (!displayMessages || displayMessages.length === 0) return true;
    const lastMsg = displayMessages[displayMessages.length - 1];
    if (lastMsg.role === "user") return true;
    const text = getMessageText(lastMsg.content).trim();
    if (!text) return true;
    return false;
  }, [agent?.isRunning, displayMessages]);

  // Dynamic Context-Aware Suggestion Pills based on active learning item type
  const suggestions = useMemo(() => {
    if (activeItem?.type === 1 || activeItem?.type === 2) {
      return [
        "Giải thích chủ đề này bằng các thuật ngữ đơn giản",
        "Cho tôi một bản tóm tắt",
        "Cho tôi câu hỏi thực hành",
        "Cho tôi ví dụ thực tế",
      ];
    }
    if (activeItem?.type === 3) {
      return [
        "Gợi ý hướng giải bài tập này",
        "Giải thích khái niệm liên quan đến câu hỏi",
        "Cho tôi bài tập tương tự để luyện tập",
      ];
    }
    return [
      "Giải thích chủ đề này bằng các thuật ngữ đơn giản",
      "Cho tôi một bản tóm tắt",
      "Cho tôi ví dụ thực tế",
    ];
  }, [activeItem?.type]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !agent || !copilotkit) return;

      agent.addMessage({
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      });
      setInputValue("");

      await copilotkit.runAgent({ agent });
    },
    [agent, copilotkit],
  );

  const handleNewChat = useCallback(() => {
    if (agent) {
      if (typeof (agent as any).setMessages === "function") {
        (agent as any).setMessages([]);
      }
      if (typeof (agent as any).reset === "function") {
        (agent as any).reset();
      }
    }
    setSessionStartIndex(agent?.messages ? agent.messages.length : 0);
    setInputValue("");
  }, [agent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages, agent?.isRunning]);

  // Handle external AI prompt trigger (from VideoPlayer Prompt Chips or external actions)
  useEffect(() => {
    if (externalPrompt && externalPrompt.trim()) {
      sendMessage(externalPrompt.trim());
      onPromptConsumed?.();
    }
  }, [externalPrompt, onPromptConsumed, sendMessage]);

  // Compute active transcript segment
  const activeTranscriptSegment = useMemo(() => {
    if (transcriptText) {
      return transcriptText.slice(0, 3000);
    }
    if (activeItem?.interactiveTranscripts && activeItem.interactiveTranscripts.length > 0) {
      return activeItem.interactiveTranscripts
        .map((t) => `[${formatTime(t.timestampSeconds)}] ${t.text}`)
        .join("\n")
        .slice(0, 3000);
    }
    return "";
  }, [transcriptText, activeItem]);

  const activeReadingContent = useMemo(() => {
    if (readingMarkdown) return readingMarkdown.slice(0, 3000);
    if (activeItem?.readingMarkdown) return activeItem.readingMarkdown.slice(0, 3000);
    return "";
  }, [readingMarkdown, activeItem]);

  const learningContext = useMemo(
    () => ({
      courseTitle,
      moduleTitle,
      activeItem: activeItem
        ? {
            id: activeItem.id,
            title: activeItem.title,
            type: getItemTypeName(activeItem.type),
            estimatedMinutes: activeItem.estimatedMinutes,
          }
        : null,
      currentTimeSeconds: Math.floor(currentTime),
      currentTimeFormatted: formatTime(currentTime),
      transcriptSnippet: activeTranscriptSegment,
      readingSnippet: activeReadingContent,
    }),
    [
      courseTitle,
      moduleTitle,
      activeItem,
      currentTime,
      activeTranscriptSegment,
      activeReadingContent,
    ],
  );

  useAgentContext({
    description:
      "Ngữ cảnh bài học 4 tầng (Khóa học, Module, Bài học hiện tại, Mốc thời gian Video & Nội dung Bài đọc)",
    value: learningContext,
  });

  // Register CopilotKit Frontend Tools
  useFrontendTool({
    name: "recommendVideoTimestamp",
    description: "Đề xuất học viên tua đến mốc thời gian quan trọng trong Video",
    parameters: z.object({
      timestampSeconds: z.number().describe("Mốc thời gian tính bằng giây"),
      timestampLabel: z.string().optional().describe("Nhãn hiển thị mốc thời gian dạng MM:SS"),
      reason: z.string().optional().describe("Lý do đề xuất xem đoạn video này"),
    }),
    handler: async ({ timestampSeconds, timestampLabel, reason }) => {
      return { timestampSeconds, timestampLabel, reason };
    },
    render: ({ args, result }) => {
      const res = result as
        | { timestampSeconds?: number; timestampLabel?: string; reason?: string }
        | undefined;
      const seconds = args?.timestampSeconds ?? res?.timestampSeconds;
      const label = args?.timestampLabel ?? res?.timestampLabel;
      const reason = args?.reason ?? res?.reason;

      if (seconds === undefined) return null;

      return <TimestampSeekCard seconds={seconds} label={label} reason={reason} onSeek={onSeek} />;
    },
  });

  useFrontendTool({
    name: "recommendSaveToNotes",
    description: "Đề xuất lưu một đoạn kiến thức vào Ghi chú cá nhân dưới dạng Card nút bấm",
    parameters: z.object({
      highlightedContent: z.string().describe("Nội dung kiến thức đề xuất lưu vào ghi chú"),
      commentText: z.string().optional().describe("Ghi chú bổ sung hoặc lý do đề xuất"),
    }),
    handler: async ({ highlightedContent, commentText }) => {
      return {
        highlightedContent,
        commentText: commentText || "Lưu từ Trợ lý AI Socratic",
      };
    },
    render: ({ args, result }) => {
      const res = result as { highlightedContent?: string; commentText?: string } | undefined;
      const content = args?.highlightedContent ?? res?.highlightedContent;
      const comment = args?.commentText ?? res?.commentText ?? "Lưu từ Trợ lý AI Socratic";

      if (!content) return null;

      return (
        <SaveNoteCard
          courseId={courseId}
          itemId={activeItem?.id}
          content={content}
          comment={comment}
          onNoteCreated={onNoteCreated}
        />
      );
    },
  });

  useFrontendTool({
    name: "navigateToNextLesson",
    description: "Chuyển sang bài học tiếp theo trong lộ trình khi học viên yêu cầu",
    parameters: z.object({}),
    handler: async () => {
      if (onNextLesson) {
        onNextLesson();
        return { success: true, message: "Đã chuyển sang bài học tiếp theo" };
      }
      return { success: false, message: "Không thể tự động chuyển bài học ở giao diện hiện tại" };
    },
  });

  return (
    <section
      aria-label="Trợ lý AI Học Tập"
      className="flex flex-col h-full w-full bg-surface-container-lowest text-on-surface rounded-3xl overflow-hidden"
    >
      {/* Drawer Header */}
      <div className="h-12 px-4 bg-surface-container-lowest flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
          <span className="font-bold text-xs text-on-surface uppercase tracking-wider">
            Trợ lý AI
          </span>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            type="button"
            variant="standard"
            size="xs"
            onClick={handleNewChat}
            className="w-7 h-7 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            title="Tạo cuộc trò chuyện mới"
            aria-label="Tạo cuộc trò chuyện mới"
          >
            <MessageSquarePlus className="w-4 h-4" aria-hidden="true" />
          </IconButton>
          {onClose && (
            <IconButton
              type="button"
              variant="standard"
              size="xs"
              onClick={onClose}
              className="w-7 h-7 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              title="Đóng Trợ lý AI"
              aria-label="Đóng Trợ lý AI"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </IconButton>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Nội dung cuộc trò chuyện với Trợ lý AI"
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-container-lowest"
      >
        {displayMessages && displayMessages.length > 0 ? (
          <>
            {displayMessages.map((msg) => (
              <div key={msg.id} className="w-full flex flex-col">
                {renderMessageItem(msg, courseId, activeItem?.id, onNoteCreated, onSeek)}
              </div>
            ))}

            {showThinkingIndicator && (
              <output
                aria-live="polite"
                className="flex items-center gap-2 text-xs text-on-surface-variant italic py-1 animate-pulse"
              >
                <Progress.Circular
                  size="sm"
                  className="w-3.5 h-3.5"
                  ariaLabel="Trợ lý AI đang suy nghĩ"
                />
                <span>Trợ lý AI đang suy nghĩ…</span>
              </output>
            )}
            <div ref={messagesEndRef} />
          </>
        ) : (
          /* Empty Chat Welcome Screen & Centered Suggestion Chips */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto">
            <div
              className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3"
              aria-hidden="true"
            >
              <Sparkles aria-hidden="true" className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-on-surface mb-1">
              Xin chào. Tôi có thể giúp gì?
            </h3>
            <p className="text-xs text-on-surface-variant mb-6 max-w-xs">
              Hỏi bất cứ điều gì về bài học hoặc chọn một gợi ý bên dưới để bắt đầu.
            </p>

            {suggestions.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-md">
                {suggestions.map((text) => (
                  <Chip
                    key={text}
                    variant="suggestion"
                    elevation="elevated"
                    onClick={() => sendMessage(text)}
                  >
                    {text}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(inputValue);
        }}
        aria-label="Khung gửi tin nhắn cho Trợ lý AI"
        className="p-3 bg-surface-container-lowest flex flex-col gap-2 shrink-0"
      >
        <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/30 rounded-full pl-2 pr-1.5 py-1 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-colors">
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Hỏi tôi bất cứ điều gì…"
            aria-label="Nhập câu hỏi cho Trợ lý AI"
            spellCheck={false}
            className="flex-1 bg-transparent border-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 shadow-none text-xs text-on-surface placeholder:text-on-surface-variant/70 py-1"
          />
          <IconButton
            type="submit"
            variant="filled"
            size="xs"
            disabled={!inputValue.trim() || agent?.isRunning}
            className={`w-8 h-8 rounded-full shrink-0 ${
              !inputValue.trim() || agent?.isRunning
                ? "bg-surface-container-high text-on-surface-variant/50 cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs cursor-pointer active:scale-95"
            }`}
            title="Gửi tin nhắn"
            aria-label="Gửi tin nhắn"
          >
            <ArrowUp className="w-4 h-4" aria-hidden="true" />
          </IconButton>
        </div>

        <p className="text-xs text-center text-on-surface-variant/70">
          AI có thể mắc sai sót. Vui lòng kiểm tra lại thông tin quan trọng.
        </p>
      </form>
    </section>
  );
}
