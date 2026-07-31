"use client";

import { useState, useMemo } from "react";
import { CopilotChat, useFrontendTool, useAgentContext } from "@copilotkit/react-core/v2";
import { useRouter, usePathname } from "next/navigation";

import { z } from "zod";

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
          "Relative path to navigate to (e.g., '/courses', '/my-courses', '/certificates', '/forum', '/financial-aid')",
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
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end pointer-events-auto">
      {/* Floating Chat Box Window */}
      {isOpen && (
        <div className="mb-3 w-[360px] sm:w-[400px] h-[500px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-up">
          {/* Header Bar */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-amber-300 animate-pulse"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
              <h3 className="font-semibold text-sm tracking-wide">Trợ lý AI</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white/90 hover:text-white cursor-pointer"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* CopilotChat Body */}
          <div className="flex-1 overflow-hidden relative">
            <CopilotChat
              labels={{
                welcomeMessageText: "Xin chào! Tôi có thể giúp gì cho bạn?",
                chatInputPlaceholder: "Nhập câu hỏi cho AI...",
              }}
            />
          </div>
        </div>
      )}

      {/* Floating Action Circular Button */}
      <div className="relative group flex items-center">
        {/* Tooltip on hover */}
        {!isOpen && (
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none absolute right-16 bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-xl shadow-lg whitespace-nowrap">
            {"Trợ lý AI"}
          </span>
        )}

        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xl hover:shadow-2xl hover:scale-108 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center relative border border-white/20"
          aria-label={"Trợ lý AI"}
        >
          {isOpen ? (
            <svg
              className="w-6 h-6 transform transition-transform duration-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <>
              {/* AI Chatbot Icon (Speech Bubble + Friendly Robot Face) */}
              <svg
                className="w-7 h-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 13.8239 3.54117 15.5213 4.47167 16.9429L3.5 20.5L7.25 19.6C8.61868 20.495 10.2479 21 12 21Z" />
                <circle cx="9" cy="11.5" r="1.25" fill="currentColor" stroke="none" />
                <circle cx="15" cy="11.5" r="1.25" fill="currentColor" stroke="none" />
                <path
                  d="M10 14.5C10.6 15.1 11.3 15.5 12 15.5C12.7 15.5 13.4 15.1 14 14.5"
                  strokeWidth={1.6}
                />
              </svg>
              {/* Active Online Status Indicator */}
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-white dark:border-slate-900 rounded-full" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
