"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  useFrontendTool,
  useAgentContext,
  useAgent,
  useCopilotKit,
} from "@copilotkit/react-core/v2";
import { useRouter, usePathname } from "next/navigation";
import { z } from "zod";
import { Sparkles, X, BotMessageSquare, MessageSquarePlus, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { AssistantMessageItem } from "@/components/ai/AssistantMessageItem";
import { getMessageText } from "@/components/ai/utils";

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [sessionStartIndex, setSessionStartIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const pathname = usePathname();

  const { agent } = useAgent({ agentId: "default" });
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
      const agentRec = agent as unknown as Record<string, unknown>;
      if (typeof agentRec.setMessages === "function") {
        (agentRec.setMessages as (msgs: unknown[]) => void)([]);
      }
      if (typeof agentRec.reset === "function") {
        (agentRec.reset as () => void)();
      }
    }
    setSessionStartIndex(agent?.messages ? agent.messages.length : 0);
    setInputValue("");
  }, [agent]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [displayMessages, agent?.isRunning, isOpen]);

  // Push current page path & platform structure into Agent Context
  const platformContext = useMemo(
    () => ({
      currentPath: pathname,
      availableSections: [
        { path: "/courses", title: "Khám phá & Danh mục khóa học" },
        { path: "/my-learning", title: "Khóa học của tôi" },
        { path: "/my-learning?tab=certificates", title: "Chứng chỉ học tập cá nhân" },
        { path: "/my-purchases", title: "Lịch sử mua hàng & Đơn hàng" },
        { path: "/forum", title: "Diễn đàn cộng đồng học tập" },
        { path: "/financial-aid", title: "Đơn xin Hỗ trợ tài chính & Học bổng" },
        { path: "/notifications", title: "Thông báo cá nhân" },
        { path: "/account-settings", title: "Cài đặt tài khoản & Hồ sơ" },
        { path: "/become-an-instructor", title: "Đăng ký làm Giảng viên" },
        { path: "/partners", title: "Trang Đối tác doanh nghiệp" },
      ],
    }),
    [pathname],
  );

  useAgentContext({
    description: "Ngữ cảnh đường dẫn hiện tại và cấu trúc các trang chức năng trên nền tảng LMS",
    value: platformContext,
  });

  // Tool 1: Navigation assistant
  useFrontendTool({
    name: "navigateTo",
    description: "Chuyển hướng người dùng đến một trang cụ thể trên hệ thống LMS.",
    parameters: z.object({
      path: z
        .string()
        .describe(
          "Đường dẫn tương đối (ví dụ: '/courses', '/my-learning', '/my-purchases', '/forum', '/financial-aid', '/notifications', '/account-settings', '/partners', '/become-an-instructor', '/instructor', '/admin')",
        ),
    }),
    handler: async ({ path }: { path: string }) => {
      router.push(path);
      return {
        success: true,
        message: `Đã chuyển hướng thành công đến ${path}`,
        path,
      };
    },
  });

  // Tool 2: Search catalog courses
  useFrontendTool({
    name: "searchCourses",
    description: "Tìm kiếm khóa học trong danh mục theo từ khóa, kỹ năng hoặc tên khóa học.",
    parameters: z.object({
      keyword: z.string().describe("Từ khóa, tên khóa học hoặc kỹ năng muốn tìm"),
    }),
    handler: async ({ keyword }: { keyword: string }) => {
      const searchUrl = `/courses?q=${encodeURIComponent(keyword)}`;
      router.push(searchUrl);
      return {
        success: true,
        message: `Đã tìm kiếm khóa học với từ khóa "${keyword}"`,
        searchUrl,
      };
    },
  });

  // Tool 3: Filter courses by category
  useFrontendTool({
    name: "filterCoursesByCategory",
    description:
      "Lọc danh mục khóa học theo chủ đề hoặc lĩnh vực (Lập trình, Data Science, Thiết kế, Business, AI).",
    parameters: z.object({
      category: z.string().describe("Tên danh mục hoặc chủ đề khóa học"),
    }),
    handler: async ({ category }: { category: string }) => {
      const url = `/courses?category=${encodeURIComponent(category)}`;
      router.push(url);
      return {
        success: true,
        message: `Đã lọc khóa học theo danh mục "${category}"`,
        url,
      };
    },
  });

  // Tool 4: View certificates
  useFrontendTool({
    name: "viewCertificates",
    description: "Chuyển nhanh đến trang xem và tải Chứng chỉ học tập cá nhân của học viên.",
    parameters: z.object({}),
    handler: async () => {
      router.push("/my-learning?tab=certificates");
      return {
        success: true,
        message: "Đã chuyển sang trang Chứng chỉ học tập cá nhân",
      };
    },
  });

  // Tool 5: Apply financial aid
  useFrontendTool({
    name: "applyFinancialAid",
    description: "Mở trang nộp đơn xin Hỗ trợ tài chính / Học bổng khóa học.",
    parameters: z.object({}),
    handler: async () => {
      router.push("/financial-aid");
      return {
        success: true,
        message: "Đã chuyển sang trang nộp đơn Hỗ trợ tài chính",
      };
    },
  });

  return (
    <div className="fixed bottom-6 right-6 z-widget flex flex-col items-end pointer-events-auto">
      {/* Floating Chat Box Window */}
      {isOpen && (
        <section
          aria-label="Trợ lý AI Hỗ Trợ"
          className="mb-3 w-[360px] sm:w-[400px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-6rem)] bg-surface-container-lowest border border-outline-variant/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-colors duration-m3-short-4 ease-m3-emphasized"
        >
          {/* Header Bar (MD3 Tonal Surface Header) */}
          <div className="px-4 py-3 bg-surface-container-lowest border-b border-outline-variant/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
              </div>
              <h3 className="font-bold text-sm text-on-surface tracking-wide">Trợ lý AI</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleNewChat}
                className="w-8 h-8 inline-flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-full transition-colors cursor-pointer"
                title="Tạo cuộc trò chuyện mới"
                aria-label="Tạo cuộc trò chuyện mới"
              >
                <MessageSquarePlus className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 inline-flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-full transition-colors cursor-pointer"
                title="Đóng Trợ lý AI"
                aria-label="Đóng Trợ lý AI"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
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
                {displayMessages.map((msg, idx) => {
                  if (msg.role === "user") {
                    return (
                      <div key={msg.id} className="flex flex-col items-end w-full my-1">
                        <div className="text-xs px-3.5 py-2 max-w-[85%] rounded-2xl bg-primary-container text-on-primary-container rounded-tr-xs font-medium border border-primary/15 shadow-2xs">
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {getMessageText(msg.content)}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  const rawText = getMessageText(msg.content).trim();
                  const roleStr = msg.role as string;
                  if (!rawText || roleStr === "tool" || roleStr === "action") return null;

                  const isLastAssistantMsg = idx === displayMessages.length - 1;
                  const isStreaming = Boolean(agent?.isRunning && isLastAssistantMsg);

                  return (
                    <div key={msg.id} className="w-full flex flex-col my-1">
                      <AssistantMessageItem text={rawText} isStreaming={isStreaming} />
                    </div>
                  );
                })}

                {showThinkingIndicator && (
                  <output
                    aria-live="polite"
                    className="flex items-center gap-2 text-xs text-on-surface-variant italic py-1 animate-pulse"
                  >
                    <Sparkles
                      className="w-3.5 h-3.5 text-primary animate-spin"
                      aria-hidden="true"
                    />
                    <span>Trợ lý AI đang suy nghĩ…</span>
                  </output>
                )}
                <div ref={messagesEndRef} />
              </>
            ) : (
              /* Empty Chat Welcome Screen (MD3 Centered Tonal Hero) */
              <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto">
                <div
                  className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3 shadow-2xs"
                  aria-hidden="true"
                >
                  <Sparkles aria-hidden="true" className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-on-surface mb-1.5">
                  Xin chào. Tôi có thể giúp gì cho bạn?
                </h3>
                <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed">
                  Hỏi tôi bất kỳ điều gì về các khóa học, chứng chỉ hoặc hướng dẫn sử dụng hệ thống.
                </p>
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
            className="p-3 bg-surface-container-lowest border-t border-outline-variant/20 flex flex-col gap-2 shrink-0"
          >
            <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/30 rounded-full pl-4 pr-1.5 py-1.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-colors">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Hỏi tôi bất cứ điều gì…"
                aria-label="Nhập câu hỏi cho Trợ lý AI"
                spellCheck={false}
                className="flex-1 bg-transparent text-xs text-on-surface placeholder:text-on-surface-variant/70 border-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring py-1"
              />
              <Button
                type="submit"
                size="icon"
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
              </Button>
            </div>

            <p className="text-xs text-center text-on-surface-variant/70">
              AI có thể mắc sai sót. Vui lòng kiểm tra lại thông tin quan trọng.
            </p>
          </form>
        </section>
      )}

      {/* Floating Action Circular Button (MD3 Primary FAB) */}
      <div className="relative flex items-center">
        <Tooltip content="Trợ lý AI" side="left">
          <Button
            variant="primary"
            size="icon"
            onClick={() => setIsOpen((prev) => !prev)}
            className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-colors duration-m3-short-4 ease-m3-emphasized relative border-none"
            aria-label="Trợ lý AI"
          >
            {isOpen ? (
              <X
                className="w-6 h-6 transform transition-transform duration-m3-short-4 ease-m3-emphasized"
                aria-hidden="true"
              />
            ) : (
              <>
                {/* AI Chatbot Icon */}
                <BotMessageSquare className="w-7 h-7" aria-hidden="true" />
                {/* Active Online Status Indicator */}
                <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-success border-2 border-background rounded-full" />
              </>
            )}
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
