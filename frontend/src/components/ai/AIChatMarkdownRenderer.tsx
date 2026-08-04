"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export function renderMarkdown(text: string): React.ReactNode {
  return (
    <div className="w-full text-xs text-on-surface leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-sm font-bold text-primary mt-3 mb-1">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xs font-bold text-primary mt-3 mb-1">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-bold text-primary mt-3 mb-1">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs font-bold text-primary mt-2 mb-1">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="text-xs text-on-surface my-1 leading-relaxed">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-on-surface">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-on-surface">{children}</em>,
          del: ({ children }) => (
            <del className="line-through text-on-surface-variant/70">{children}</del>
          ),
          ul: ({ children }) => <ul className="list-disc ml-4 space-y-0.5 my-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal ml-4 space-y-0.5 my-1">{children}</ol>,
          li: ({ children }) => (
            <li className="text-xs text-on-surface leading-relaxed">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-primary/50 pl-3 py-1 italic bg-primary/5 rounded-r-lg text-xs text-on-surface-variant">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.includes("language-") || String(children).includes("\n");
            if (isBlock) {
              return (
                <pre className="my-2 p-3 bg-surface-container-highest text-primary font-mono text-[11px] rounded-lg overflow-x-auto border border-outline-variant/30">
                  <code>{children}</code>
                </pre>
              );
            }
            return (
              <code className="px-1.5 py-0.5 bg-surface-container-highest text-primary font-mono text-[11px] rounded border border-outline-variant/30">
                {children}
              </code>
            );
          },
          hr: () => <hr className="my-3 border-outline-variant/30" />,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary-hover font-medium transition-colors"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 border border-outline-variant/30 rounded-xl bg-surface-container-high/40">
              <table className="min-w-full divide-y divide-outline-variant/30 text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-surface-container-high">{children}</thead>,
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-bold text-primary">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-t border-outline-variant/20 text-on-surface">
              {children}
            </td>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
