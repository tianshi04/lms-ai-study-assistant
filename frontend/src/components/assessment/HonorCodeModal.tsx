"use client";

import React, { useState } from "react";
import { getRpcClient } from "@/lib/connect_client";
import { AssessmentService } from "@/gen/assessment/v1/assessment_pb";

interface HonorCodeModalProps {
  itemId: string;
  userId?: string;
  isOpen: boolean;
  onAgreed: () => void;
  onClose: () => void;
}

export function HonorCodeModal({
  itemId,
  userId = "user-demo-1",
  isOpen,
  onAgreed,
  onClose,
}: HonorCodeModalProps) {
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!isChecked) {
      setErrorMsg("You must agree to the Academic Honor Code to proceed.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const client = getRpcClient(AssessmentService);
      const res = await client.submitHonorCode({
        userId,
        itemId,
        isAgreed: true,
      });

      if (res.success) {
        onAgreed();
      } else {
        setErrorMsg(res.message || "Failed to confirm Honor Code.");
      }
    } catch (err) {
      // Fallback for offline demo mode
      console.warn("RPC submitHonorCode failed, using local fallback:", err);
      onAgreed();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Academic Honor Code
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Coursera Integrity Commitment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p>
            By submitting this assessment, I agree that all work submitted is my own original creation.
          </p>
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 space-y-2">
            <h4 className="font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5">
              ⚠️ Strict Honor Guidelines:
            </h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-amber-800 dark:text-amber-300">
              <li>I will not plagiarize code, text, or answers from external sources.</li>
              <li>I will not post solution answers to public forums or AI generators.</li>
              <li>I understand that violations may result in certificate revocation.</li>
            </ul>
          </div>

          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 transition-colors">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug">
              I understand and agree to abide by the Academic Honor Code.
            </span>
          </label>

          {errorMsg && (
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-200 dark:border-red-900/50">
              {errorMsg}
            </p>
          )}
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isChecked || isSubmitting}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            {isSubmitting ? "Submitting..." : "I Agree & Continue 🚀"}
          </button>
        </div>
      </div>
    </div>
  );
}
