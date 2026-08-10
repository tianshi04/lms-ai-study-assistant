"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useMemo } from "react";
import { getRpcClient } from "@/lib/connect_client";
import { AssessmentService } from "@/gen/assessment/v1/assessment_pb";
import { Check, X, Lock, Play, RotateCcw, FlaskConical, Eye, EyeOff, BookOpen } from "lucide-react";
import { renderMarkdown } from "@/components/ai/AIChatMarkdownRenderer";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Surface } from "@/components/ui/Surface";
import { Progress } from "@/components/ui/Progress";
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
    <Card variant="outlined" className="space-y-0 max-w-6xl mx-auto shadow-xl overflow-hidden">
      {/* ═══ Problem Description ═══ */}
      {description && (
        <details className="border-b border-border" open>
          <summary className="flex items-center gap-2 px-4 sm:px-6 py-3 cursor-pointer text-xs font-bold uppercase tracking-wider text-foreground bg-muted/30 hover:bg-muted/50 transition-colors">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            Mô tả đề bài
          </summary>
          <div className="px-4 sm:px-6 py-4 prose prose-sm dark:prose-invert max-w-none text-sm bg-surface-container-lowest">
            {renderMarkdown(description)}
          </div>
        </details>
      )}
      {/* ═══ Top Bar ═══ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:px-6 sm:py-4 border-b border-border bg-surface-container-low">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="primary">
              <FlaskConical className="w-3 h-3 mr-1" />
              SANDBOX LAB
            </Badge>
            <span className="text-[11px] text-muted-foreground font-mono">
              Timeout: 30s • Memory: 512MB
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-foreground mt-1">
            {title || "Auto-Graded Coding Assignment"}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={language}
            onValueChange={(val) => {
              if (val) setLanguage(val as string);
            }}
          >
            <Select.Trigger className="w-[160px] text-xs font-mono font-medium">
              <Select.Value placeholder="Ngôn ngữ">
                {language === "python"
                  ? "Python 3.13"
                  : language === "javascript"
                    ? "JavaScript (Node)"
                    : language}
              </Select.Value>
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="python">{"Python 3.13"}</Select.Item>
              <Select.Item value="javascript">{"JavaScript (Node)"}</Select.Item>
            </Select.Content>
          </Select>
          <Button onClick={handleRunCode} disabled={isRunning} size="sm" className="gap-1.5">
            {isRunning ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Đang chấm…
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Run & Submit
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ═══ Main Workspace ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px]">
        {/* ─── Code Editor ─── */}
        <div className="lg:col-span-7 flex flex-col border-r border-border">
          <div className="flex items-center justify-between px-4 py-2 text-[11px] text-muted-foreground font-mono border-b border-border bg-muted/50">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-success/60" />
              solution.py
            </span>
            <span>UTF-8</span>
          </div>
          <Textarea
            value={sourceCode}
            onChange={(e) => setSourceCode(e.target.value)}
            rows={18}
            spellCheck={false}
            className="flex-1 font-mono text-[13px] leading-relaxed text-foreground bg-[var(--color-surface-container-lowest)] resize-none rounded-none border-0 focus:ring-0 p-4"
            style={{ tabSize: 4 }}
          />
        </div>

        {/* ─── Right Panel: Test Cases or Results ─── */}
        <div className="lg:col-span-5 flex flex-col bg-muted/30">
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-2 text-[11px] text-muted-foreground font-mono border-b border-border bg-muted/50">
            {showResults && labResult ? (
              <>
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  📊 Kết quả chấm
                </span>
                <button
                  onClick={() => setShowResults(false)}
                  className="flex items-center gap-1 text-primary hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Xem Test Cases
                </button>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5">
                  📋 Test Cases
                </span>
                <span>
                  {visibleCases.length > 0 && (
                    <>
                      <Eye className="w-3 h-3 inline mr-0.5" />
                      {visibleCases.length} visible
                    </>
                  )}
                  {hiddenCount > 0 && (
                    <span className="ml-2">
                      <EyeOff className="w-3 h-3 inline mr-0.5" />
                      {hiddenCount} hidden
                    </span>
                  )}
                </span>
              </>
            )}
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* ─── Results View ─── */}
            {showResults && labResult ? (
              <div className="space-y-4">
                {/* Score Banner */}
                <div
                  className={`p-4 rounded-xl border-2 flex items-center justify-between ${
                    labResult.passed
                      ? "bg-success/10 border-success/40"
                      : "bg-destructive/10 border-destructive/40"
                  }`}
                >
                  <span className="font-bold text-base flex items-center gap-2">
                    {labResult.passed ? (
                      <>
                        <Check className="w-5 h-5 text-success" />
                        <span className="text-success">PASSED</span>
                      </>
                    ) : (
                      <>
                        <X className="w-5 h-5 text-destructive" />
                        <span className="text-destructive">FAILED</span>
                      </>
                    )}
                  </span>
                  <div className="text-right">
                    <span className={`text-2xl font-bold ${labResult.passed ? "text-success" : "text-destructive"}`}>
                      {labResult.scorePercent}%
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      {labResult.passedTestCases}/{labResult.totalTestCases} test cases
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
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
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
                    Execution Logs
                  </h5>
                  <pre className="p-3 rounded-lg bg-card text-[11px] font-mono text-foreground border border-border whitespace-pre-wrap max-h-[200px] overflow-y-auto leading-relaxed">
                    {labResult.testLogs
                      .split("\n")
                      .map((line) => {
                        // Extract test case number from log line like "[PASS] Test Case #3: ..."
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
              <div className="space-y-3">
                {testCases.length === 0 && !isRunning && (
                  <p className="text-muted-foreground text-sm italic py-8 text-center">
                    Bấm <strong>&quot;Run & Submit&quot;</strong> để chạy bài trong Sandbox.
                  </p>
                )}

                {isRunning && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <span className="w-8 h-8 rounded-full border-3 border-primary/30 border-t-primary animate-spin" />
                    <span className="text-sm text-muted-foreground" aria-live="polite">
                      Đang biên dịch & chạy test cases…
                    </span>
                  </div>
                )}

                {!isRunning &&
                  testCases.map((tc, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border bg-card p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          {tc.is_hidden ? (
                            <>
                              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                              Test Case {i + 1}
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 rounded-full bg-primary/60" />
                              Test Case {i + 1}
                            </>
                          )}
                        </span>
                        {tc.is_hidden ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Hidden
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            Visible
                          </Badge>
                        )}
                      </div>

                      {tc.is_hidden ? (
                        <p className="text-xs text-muted-foreground italic pl-5">
                          Bài kiểm tra ẩn — kết quả chỉ hiện sau khi submit.
                        </p>
                      ) : (
                        <div className="space-y-1.5 pl-5">
                          {tc.input && (
                            <div className="flex gap-2 text-xs">
                              <span className="text-muted-foreground font-medium min-w-[60px]">Input:</span>
                              <code className="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">
                                {tc.input}
                              </code>
                            </div>
                          )}
                          <div className="flex gap-2 text-xs">
                            <span className="text-muted-foreground font-medium min-w-[60px]">Expected:</span>
                            <code className="font-mono text-success bg-success/10 px-1.5 py-0.5 rounded">
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
    </Surface>
  );
}
