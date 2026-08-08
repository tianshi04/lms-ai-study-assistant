"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect } from "react";
import { getRpcClient } from "@/lib/connect_client";
import { AssessmentService } from "@/gen/assessment/v1/assessment_pb";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/shared/Badge";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { mapConnectError } from "@/lib/connect_error_mapper";

interface AutoGradedLabRunnerProps {
  itemId: string;
  title?: string;
  starterCode?: string;
  language?: string;
  userId?: string;
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

export function AutoGradedLabRunner({
  itemId,
  title,
  starterCode,
  language: initialLanguage,
  onComplete,
}: AutoGradedLabRunnerProps) {
  const [sourceCode, setSourceCode] = useState(starterCode || DEFAULT_PYTHON_STARTER);
  const [language, setLanguage] = useState(initialLanguage || "python");
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    setSourceCode(starterCode || DEFAULT_PYTHON_STARTER);
    setLanguage(initialLanguage || "python");
  }, [itemId, starterCode, initialLanguage]);

  const [labResult, setLabResult] = useState<{
    scorePercent: number;
    passed: boolean;
    totalTestCases: number;
    passedTestCases: number;
    testLogs: string;
  } | null>(null);

  const handleRunCode = async () => {
    setIsRunning(true);
    setLabResult(null);

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
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto p-4 sm:p-6 bg-card text-foreground border border-border rounded-2xl shadow-xl">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="verified">SANDBOX LAB</Badge>
            <span className="text-xs text-muted-foreground">Timeout: 30s • Memory: 512MB</span>
          </div>
          <h3 className="text-lg font-bold text-foreground mt-1">
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
            <SelectTrigger className="w-[170px] text-xs font-mono font-medium">
              <SelectValue placeholder="Ngôn ngữ">
                {language === "python"
                  ? "Python 3.12"
                  : language === "javascript"
                    ? "JavaScript (Node.js)"
                    : language}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="python">{"Python 3.12"}</SelectItem>
              <SelectItem value="javascript">{"JavaScript (Node.js)"}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRunCode} isLoading={isRunning} size="sm">
            {isRunning ? "Executing in Sandbox…" : "Run & Submit Code"}
          </Button>
        </div>
      </div>

      {/* Code Editor & Console Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Code Editor TextArea */}
        <div className="lg:col-span-7 space-y-2">
          <div className="flex items-center justify-between px-2 text-xs text-muted-foreground font-mono">
            <span>solution.py</span>
            <span>UTF-8</span>
          </div>
          <Textarea
            value={sourceCode}
            onChange={(e) => setSourceCode(e.target.value)}
            rows={14}
            spellCheck={false}
            className="font-mono text-xs text-success bg-muted resize-y"
          />
        </div>

        {/* Output Console & Test Results */}
        <div className="lg:col-span-5 flex flex-col space-y-2">
          <div className="flex items-center justify-between px-2 text-xs text-muted-foreground font-mono">
            <span>Sandbox Output Console</span>
            <span>
              {labResult
                ? `${labResult.passedTestCases}/${labResult.totalTestCases} Passed`
                : "Ready"}
            </span>
          </div>

          <div className="flex-1 p-4 rounded-xl bg-muted border border-border font-mono text-xs text-foreground min-h-[280px] overflow-y-auto space-y-3">
            {!labResult && !isRunning && (
              <p className="text-muted-foreground italic">
                Press &quot;Run &amp; Submit Code&quot; to execute tests against your implementation
                in the Sandbox container.
              </p>
            )}

            {isRunning && (
              <div className="flex items-center gap-2 text-warning animate-pulse">
                <span className="w-2 h-2 rounded-full bg-warning animate-ping"></span>
                <span aria-live="polite">Compiling &amp; executing test cases in Sandbox…</span>
              </div>
            )}

            {labResult && (
              <div className="space-y-3">
                <div
                  className={`p-3 rounded-lg border flex items-center justify-between ${
                    labResult.passed
                      ? "bg-success/10 border-success/30 text-success"
                      : "bg-destructive/10 border-destructive/30 text-destructive"
                  }`}
                >
                  <span className="font-bold flex items-center gap-1.5">
                    {labResult.passed ? (
                      <>
                        <Check className="w-4 h-4 text-success" aria-hidden="true" />
                        PASSED
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 text-destructive" aria-hidden="true" />
                        FAILED
                      </>
                    )}
                  </span>
                  <span className="font-bold text-sm">{labResult.scorePercent}%</span>
                </div>

                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Execution Logs:
                  </h5>
                  <pre className="p-3 rounded-lg bg-card text-xs font-mono text-foreground border border-border whitespace-pre-wrap">
                    {labResult.testLogs}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
