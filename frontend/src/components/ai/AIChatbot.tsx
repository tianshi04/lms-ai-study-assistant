"use client";

import { useState, useMemo } from "react";
import { CopilotChat, useFrontendTool, useAgentContext } from "@copilotkit/react-core/v2";
import { useRouter, usePathname } from "next/navigation";

import { z } from "zod";
import { Sparkles, X, BotMessageSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Push current page path into global Agent Context on every navigation turn
  const routeContext = useMemo(() => ({ currentPath: pathname }), [pathname]);
  useAgentContext({
    description: "Current active page URL path in the LMS platform",
    value: routeContext,
  });

  // Tool 1: Navigation assistant
  useFrontendTool({
    name: "navigateTo",
    description: "Navigate the user to a specific page on the LMS platform.",
    parameters: z.object({
      path: z
        .string()
        .describe(
          "Relative path to navigate to (e.g., '/courses', '/my-learning', '/certificates', '/forum', '/financial-aid')",
        ),
    }),
    handler: async ({ path }: { path: string }) => {
      router.push(path);
      return {
        success: true,
        message: `Successfully navigated to ${path}`,
        path,
      };
    },
  });

  // Tool 2: Search catalog courses
  useFrontendTool({
    name: "searchCourses",
    description: "Search for learning courses in the catalog by topic or keyword.",
    parameters: z.object({
      keyword: z.string().describe("Course title, skill, or keyword to search for"),
    }),
    handler: async ({ keyword }: { keyword: string }) => {
      const searchUrl = `/courses?q=${encodeURIComponent(keyword)}`;
      router.push(searchUrl);
      return {
        success: true,
        message: `Navigated to catalog search with keyword "${keyword}"`,
        searchUrl,
      };
    },
  });

  return (
    <div className="fixed bottom-6 right-6 z-widget flex flex-col items-end pointer-events-auto">
      {/* Floating Chat Box Window */}
      {isOpen && (
        <div className="mb-3 w-[360px] sm:w-[400px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-6rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header Bar */}
          <div className="px-4 py-3 bg-primary text-primary-foreground flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-warning" />
              <h3 className="font-semibold text-sm tracking-wide">Trợ lý AI</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10"
              aria-label="Đóng"
            >
              <X aria-hidden="true" className="w-5 h-5" />
            </Button>
          </div>

          {/* CopilotChat Body */}
          <div className="flex-1 overflow-hidden relative">
            <CopilotChat
              labels={{
                welcomeMessageText: "Xin chào! Tôi có thể giúp gì cho bạn?",
                chatInputPlaceholder: "Hỏi tôi bất cứ điều gì",
              }}
            />
          </div>
        </div>
      )}

      {/* Floating Action Circular Button */}
      <div className="relative flex items-center">
        <Tooltip content="Trợ lý AI" side="left">
          <Button
            variant="primary"
            size="icon"
            onClick={() => setIsOpen((prev) => !prev)}
            className="w-14 h-14 rounded-full shadow-md hover:shadow-lg transition-all duration-200 ease-m3-emphasized relative border border-border"
            aria-label="Trợ lý AI"
          >
            {isOpen ? (
              <X
                className="w-6 h-6 transform transition-transform duration-200"
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
