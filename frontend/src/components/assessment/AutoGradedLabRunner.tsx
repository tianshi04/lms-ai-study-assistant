"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useMemo } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
import { useTheme } from "next-themes";
import { getRpcClient } from "@/lib/connect_client";
import { AssessmentService } from "@/gen/assessment/v1/assessment_pb";
import {
  Check,
  X,
  Lock,
  Play,
  FlaskConical,
  Eye,
  EyeOff,
  BookOpen,
  BarChart3,
  ClipboardCheck,
  ArrowLeft,
} from "lucide-react";
import { renderMarkdown } from "@/components/ai/AIChatMarkdownRenderer";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { mapConnectError } from "@/lib/connect_error_mapper";

/* ─── Types ─── */
interface TestCaseData {
  input?: string;
  expected_output?: string;
  expected?: string;
  is_hidden?: boolean;
  assertion_code?: string;
}

interface LabResult {
  scorePercent: number;
  passed: boolean;
  totalTestCases: number;
  passedTestCases: number;
  testLogs: string;
}

interface AutoGradedLabRunnerProps {
  itemId: string;
  title?: string;
  starterCode?: string;
  language?: string;
  userId?: string;
  testCasesJson?: string;
  description?: string;
  onComplete?: () => void;
}

const DEFAULT_PYTHON_STARTER = `# Auto-Graded Lab: Python Array Sum Solution
# Task: Write a function solution(arr) that returns the sum of all elements in list 'arr'.

def solution(arr):
    # Your implementation here
    if not arr:
        return 0
    return sum(arr)
`;

/* ─── Helpers ─── */
function parseTestCases(json?: string): TestCaseData[] {
  if (!json) return [];
  try {
    let parsed = JSON.parse(json);
    // Handle double-encoded JSON
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* ─── Component ─── */
export function AutoGradedLabRunner({
  itemId,
  title,
  starterCode,
  language: initialLanguage,
  testCasesJson,
  description,
  onComplete,
}: AutoGradedLabRunnerProps) {
  const [sourceCode, setSourceCode] = useState(starterCode || DEFAULT_PYTHON_STARTER);
  const [language, setLanguage] = useState(initialLanguage || "python");
  const [isRunning, setIsRunning] = useState(false);
  const [labResult, setLabResult] = useState<LabResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  const { resolvedTheme } = useTheme();
  const editorTheme = resolvedTheme === "dark" ? githubDark : githubLight;

  const editorThemeOverride = useMemo(() => {
    return EditorView.theme({
      "&": {
        height: "100%",
        backgroundColor: "transparent !important",
      },
      ".cm-scroller": {
        overflow: "auto !important",
        fontFamily: "inherit !important",
      },
      ".cm-gutters": {
        backgroundColor: "transparent !important",
        borderRight: "none !important",
        border: "none !important",
      },
      ".cm-gutter": {
        backgroundColor: "transparent !important",
      },
      ".cm-lineNumbers": {
        borderRight: "none !important",
        border: "none !important",
      },
      ".cm-lineNumbers .cm-gutterElement": {
        paddingRight: "12px !important",
        minWidth: "28px !important",
        backgroundColor: "transparent !important",
        opacity: "0.45",
        fontWeight: "400",
        transition: "opacity 0.15s ease, font-weight 0.15s ease, color 0.15s ease",
      },
      ".cm-lineNumbers .cm-activeLineGutter, .cm-activeLineGutter": {
        backgroundColor: "transparent !important",
        color: "var(--foreground) !important",
        fontWeight: "600 !important",
        opacity: "1 !important",
      },
      ".cm-activeLine": {
        backgroundColor: "transparent !important",
      },
      "&.cm-focused": {
        outline: "none !important",
      },
    });
  }, []);

  const extensions = useMemo(() => {
    const langExt = language === "javascript" ? javascript() : python();
    return [langExt, EditorView.lineWrapping, editorThemeOverride];
  }, [language, editorThemeOverride]);

  useEffect(() => {
    setSourceCode(starterCode || DEFAULT_PYTHON_STARTER);
    setLanguage(initialLanguage || "python");
    setLabResult(null);
    setShowResults(false);
  }, [itemId, starterCode, initialLanguage]);

  const testCases = useMemo(() => parseTestCases(testCasesJson), [testCasesJson]);
  const visibleCases = useMemo(() => testCases.filter((tc) => !tc.is_hidden), [testCases]);
  const hiddenCount = useMemo(() => testCases.filter((tc) => tc.is_hidden).length, [testCases]);

  const handleRunCode = async () => {
    setIsRunning(true);
    setLabResult(null);
    setShowResults(false);

    try {
      const client = getRpcClient(AssessmentService);
      const res = await client.submitAutoGradedLab({
        itemId,
        sourceCode,
        language,
      });

      if (res.result) {
        setLabResult({
          scorePercent: res.result.scorePercent,
          passed: res.result.passed,
          totalTestCases: res.result.totalTestCases,
          passedTestCases: res.result.passedTestCases,
          testLogs: res.result.testLogs,
        });
        setShowResults(true);

        if (res.result.passed && onComplete) {
          onComplete();
        }
      }
    } catch (err) {
      const errorMsg = mapConnectError(err, "Chấm bài Lab tự động thất bại. Vui lòng thử lại.");
      setLabResult({
        scorePercent: 0.0,
        passed: false,
        totalTestCases: 1,
        passedTestCases: 0,
        testLogs: `[ERROR] ${errorMsg}`,
      });
      setShowResults(true);
    } finally {
      setIsRunning(false);
    }
  };

  /* ─── Parse result logs to per-test-case status ─── */
  const perTestStatus = useMemo(() => {
    if (!labResult) return [];
    const lines = labResult.testLogs.split("\n");
    return lines
      .filter((l) => l.startsWith("[PASS]") || l.startsWith("[FAIL]") || l.startsWith("[TIMEOUT]"))
      .map((l) => ({
        passed: l.startsWith("[PASS]"),
        line: l,
      }));
  }, [labResult]);

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 font-sans space-y-3">
      {/* ═══ Top Header & Controls ═══ */}
      <div className="w-full pb-3 border-b border-border space-y-2.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/15 text-primary border border-primary/30 shrink-0">
                <FlaskConical className="w-3.5 h-3.5" aria-hidden="true" />
                SANDBOX LAB
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                Timeout: 30s • Memory: 512MB
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground truncate" title={title}>
              {title || "Auto-Graded Coding Assignment"}
            </h2>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            <Select
              value={language}
              onValueChange={(val) => {
                if (val) setLanguage(val as string);
              }}
            >
              <Select.Trigger className="w-[140px] text-xs font-mono font-medium">
                <Select.Value placeholder="Ngôn ngữ">
                  {language === "python"
                    ? "Python 3.13"
                    : language === "javascript"
                      ? "JavaScript"
                      : language}
                </Select.Value>
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="python">Python 3.13</Select.Item>
                <Select.Item value="javascript">JavaScript (Node)</Select.Item>
              </Select.Content>
            </Select>

            <Button
              onClick={handleRunCode}
              disabled={isRunning}
              size="sm"
              className="gap-2 whitespace-nowrap px-4"
            >
              {isRunning ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Đang chấm…</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span>Chạy & Nộp bài</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Problem Description Accordion (if provided) */}
        {description && (
          <details
            className="rounded-xl border border-border/80 bg-surface-container-low/30 overflow-hidden"
            open
          >
            <summary className="flex items-center gap-2 px-4 py-2 cursor-pointer text-xs font-bold uppercase tracking-wider text-foreground bg-surface-container-low/70 hover:bg-surface-container-low transition-colors select-none">
              <BookOpen className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              Mô tả đề bài & Yêu cầu
            </summary>
            <div className="px-4 py-3 prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm bg-surface-container-lowest/90 leading-relaxed">
              {renderMarkdown(description)}
            </div>
          </details>
        )}
      </div>

      {/* ═══ Split IDE Workspace - Fills 100% Remaining Height ═══ */}
      <div className="w-full flex-1 min-h-[440px] grid grid-cols-1 lg:grid-cols-12 rounded-2xl bg-transparent overflow-hidden">
        {/* ─── Left Column: Code Editor (CodeMirror 6) ─── */}
        <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-border/70 h-full bg-transparent min-h-0">
          <div
            className="flex items-center gap-1.5 px-3 py-2 select-none shrink-0"
            aria-hidden="true"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/90" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/90" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/90" />
          </div>
          <div className="flex-1 w-full overflow-hidden h-full min-h-0 bg-transparent">
            <CodeMirror
              value={sourceCode}
              height="100%"
              extensions={extensions}
              theme={editorTheme}
              onChange={(val) => setSourceCode(val)}
              basicSetup={{
                lineNumbers: true,
                highlightActiveLineGutter: true,
                highlightSpecialChars: true,
                history: true,
                foldGutter: true,
                drawSelection: true,
                dropCursor: true,
                allowMultipleSelections: true,
                indentOnInput: true,
                syntaxHighlighting: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                rectangularSelection: true,
                crosshairCursor: true,
                highlightActiveLine: false,
                highlightSelectionMatches: true,
                closeBracketsKeymap: true,
                defaultKeymap: true,
                searchKeymap: true,
                historyKeymap: true,
                foldKeymap: true,
                completionKeymap: true,
                lintKeymap: true,
                tabSize: 4,
              }}
              className="text-[13px] font-mono leading-relaxed h-full [&_.cm-editor]:h-full [&_.cm-scroller]:h-full [&_.cm-scroller]:overflow-auto [&_.cm-gutters]:border-none [&_.cm-gutters]:border-r-0 [&_.cm-gutters]:bg-transparent [&_.cm-gutterElement]:pr-3"
            />
          </div>
        </div>

        {/* ─── Right Column: Test Cases or Results ─── */}
        <div className="lg:col-span-5 flex flex-col bg-transparent h-full min-h-0 pl-0 lg:pl-2">
          {/* Panel Header */}
          <div className="flex items-center justify-between px-2 py-2 text-[11px] text-muted-foreground font-mono bg-transparent select-none shrink-0">
            {showResults && labResult ? (
              <>
                <span className="flex items-center gap-1.5 font-bold text-foreground">
                  <BarChart3 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  <span>Kết quả chấm</span>
                </span>
                <Button
                  type="button"
                  variant="text"
                  size="xs"
                  onClick={() => setShowResults(false)}
                  className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Xem test cases</span>
                </Button>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                  <ClipboardCheck
                    className="w-3.5 h-3.5 text-muted-foreground/70"
                    aria-hidden="true"
                  />
                  <span>Test Cases</span>
                </span>
                <span className="text-[11px] text-muted-foreground/70 flex items-center gap-2">
                  {visibleCases.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" aria-hidden="true" />
                      <span>{visibleCases.length} công khai</span>
                    </span>
                  )}
                  {hiddenCount > 0 && (
                    <span className="flex items-center gap-1">
                      <EyeOff className="w-3 h-3" aria-hidden="true" />
                      <span>{hiddenCount} ẩn</span>
                    </span>
                  )}
                </span>
              </>
            )}
          </div>

          {/* Panel Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* ─── Results View ─── */}
            {showResults && labResult ? (
              <div className="space-y-4">
                {/* Score Banner */}
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between shadow-xs ${
                    labResult.passed
                      ? "bg-success/10 border-success/30 text-success"
                      : "bg-destructive/10 border-destructive/30 text-destructive"
                  }`}
                >
                  <span className="font-bold text-base flex items-center gap-2">
                    {labResult.passed ? (
                      <>
                        <Check className="w-5 h-5 text-success" />
                        <span>ĐẠT</span>
                      </>
                    ) : (
                      <>
                        <X className="w-5 h-5 text-destructive" />
                        <span>CHƯA ĐẠT</span>
                      </>
                    )}
                  </span>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold tabular-nums">
                      {labResult.scorePercent}%
                    </span>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {labResult.passedTestCases}/{labResult.totalTestCases} bài kiểm thử đạt
                    </p>
                  </div>
                </div>

                {/* Per-test pills */}
                <div className="flex flex-wrap gap-2">
                  {perTestStatus.map((t, i) => {
                    const isHidden = testCases[i]?.is_hidden;
                    return (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          t.passed
                            ? "bg-success/10 text-success border-success/30"
                            : "bg-destructive/10 text-destructive border-destructive/30"
                        }`}
                      >
                        {t.passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        TC #{i + 1}
                        {isHidden && <Lock className="w-2.5 h-2.5 ml-0.5 opacity-60" />}
                      </span>
                    );
                  })}
                </div>

                {/* Logs */}
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Nhật ký thực thi (Execution Logs)
                  </h5>
                  <pre className="p-3 rounded-xl bg-surface-container-lowest text-[11px] font-mono text-foreground border border-border whitespace-pre-wrap max-h-[180px] overflow-y-auto leading-relaxed">
                    {labResult.testLogs
                      .split("\n")
                      .map((line) => {
                        const match = line.match(/Test Case #(\d+)/);
                        if (match) {
                          const tcIndex = parseInt(match[1], 10) - 1;
                          if (testCases[tcIndex]?.is_hidden) {
                            const status = line.startsWith("[PASS]") ? "[PASS]" : "[FAIL]";
                            return `${status} Test Case #${match[1]}: [Hidden]`;
                          }
                        }
                        return line;
                      })
                      .join("\n")}
                  </pre>
                </div>
              </div>
            ) : (
              /* ─── Test Cases View ─── */
              <div className="space-y-2.5">
                {testCases.length === 0 && !isRunning && (
                  <p className="text-muted-foreground text-xs italic py-8 text-center">
                    Bấm <strong>&quot;Chạy & Nộp bài&quot;</strong> để chạy bài trong Sandbox.
                  </p>
                )}

                {isRunning && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <span className="w-8 h-8 rounded-full border-3 border-primary/30 border-t-primary animate-spin" />
                    <span className="text-xs text-muted-foreground" aria-live="polite">
                      Đang biên dịch & chạy kiểm thử trong Sandbox…
                    </span>
                  </div>
                )}

                {!isRunning &&
                  testCases.map((tc, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border/40 bg-surface-container-low/20 p-2.5 space-y-1.5 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                          {tc.is_hidden ? (
                            <>
                              <Lock className="w-3 h-3 text-muted-foreground/60" />
                              Test Case {i + 1}
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                              Test Case {i + 1}
                            </>
                          )}
                        </span>
                        {tc.is_hidden ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] text-muted-foreground/70 bg-surface-container-high/30">
                            Ẩn
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] text-muted-foreground/70 bg-surface-container-high/30">
                            Công khai
                          </span>
                        )}
                      </div>

                      {tc.is_hidden ? (
                        <p className="text-[11px] text-muted-foreground/60 italic pl-3">
                          Bài kiểm tra ẩn — kết quả chỉ hiện sau khi nộp bài.
                        </p>
                      ) : (
                        <div className="space-y-1 pl-3">
                          {tc.input && (
                            <div className="flex gap-2 text-[11px]">
                              <span className="text-muted-foreground/70 font-mono min-w-[55px]">
                                Input:
                              </span>
                              <code className="font-mono text-foreground/90 bg-surface-container-low/50 px-1 py-0.5 rounded text-[11px]">
                                {tc.input}
                              </code>
                            </div>
                          )}
                          <div className="flex gap-2 text-[11px]">
                            <span className="text-muted-foreground/70 font-mono min-w-[55px]">
                              Expected:
                            </span>
                            <code className="font-mono text-foreground/90 bg-surface-container-low/50 px-1 py-0.5 rounded text-[11px]">
                              {tc.expected_output || tc.expected || "—"}
                            </code>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
