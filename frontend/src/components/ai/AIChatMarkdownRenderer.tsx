"use client";

import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";

interface AIChatMarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

export function AIChatMarkdownRenderer({
  content,
  isStreaming = false,
}: AIChatMarkdownRendererProps) {
  return (
    <div className="w-full text-xs text-on-surface leading-relaxed">
      <Streamdown
        plugins={{ code, math }}
        caret="block"
        isAnimating={isStreaming}
        mode={isStreaming ? "streaming" : "static"}
        linkSafety={{ enabled: false }}
        controls={true}
        className="w-full"
      >
        {content}
      </Streamdown>
    </div>
  );
}

export function renderMarkdown(text: string, isStreaming = false): React.ReactNode {
  return <AIChatMarkdownRenderer content={text} isStreaming={isStreaming} />;
}
