"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="w-6 h-6 text-on-surface-variant/70 hover:text-primary mt-1"
        title="Sao chép câu trả lời"
        aria-label="Sao chép câu trả lời"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-success" aria-hidden="true" />
        ) : (
          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}
