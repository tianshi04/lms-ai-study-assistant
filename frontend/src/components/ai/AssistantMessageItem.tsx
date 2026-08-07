"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { renderMarkdown } from "./AIChatMarkdownRenderer";

export function AssistantMessageItem({
  text,
  isStreaming = false,
}: {
  text: string;
  isStreaming?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy AI text:", err);
    }
  };

  return (
    <div className="flex flex-col items-start w-full py-1 group">
      <div className="w-full text-xs text-on-surface leading-relaxed">
        {renderMarkdown(text, isStreaming)}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="w-6 h-6 inline-flex items-center justify-center text-on-surface-variant/70 hover:text-primary transition-colors cursor-pointer mt-1 rounded-md hover:bg-surface-container-high border border-transparent hover:border-outline-variant/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="Sao chép câu trả lời"
        aria-label="Sao chép câu trả lời"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-success" aria-hidden="true" />
        ) : (
          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
