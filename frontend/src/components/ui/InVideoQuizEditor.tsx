"use client";

import React, { useState, useRef } from "react";
import { useToast } from "@/components/ui/Toast";

export interface InVideoQuizItem {
  timestampSeconds: number;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

interface InVideoQuizEditorProps {
  videoUrl: string;
  quizzes: InVideoQuizItem[];
  onChange: (quizzes: InVideoQuizItem[]) => void;
}

export function InVideoQuizEditor({
  videoUrl,
  quizzes,
  onChange,
}: InVideoQuizEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const toast = useToast();

  const [timestampSeconds, setTimestampSeconds] = useState<number>(0);
  const [question, setQuestion] = useState<string>("");
  const [optA, setOptA] = useState<string>("");
  const [optB, setOptB] = useState<string>("");
  const [optC, setOptC] = useState<string>("");
  const [optD, setOptD] = useState<string>("");
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number>(0);
  const [explanation, setExplanation] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const captureCurrentTime = () => {
    if (videoRef.current) {
      const currentSec = Math.floor(videoRef.current.currentTime);
      setTimestampSeconds(currentSec);
      toast.info(`Đã chọn mốc thời gian ${currentSec}s từ Video.`);
    }
  };

  const handleAddOrUpdateQuiz = (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      toast.error("Vui lòng nhập nội dung câu hỏi.");
      return;
    }

    if (!optA.trim() || !optB.trim()) {
      toast.error("Vui lòng nhập tối thiểu 2 đáp án (A và B).");
      return;
    }

    const options = [optA.trim(), optB.trim()];
    if (optC.trim()) options.push(optC.trim());
    if (optD.trim()) options.push(optD.trim());

    const newQuiz: InVideoQuizItem = {
      timestampSeconds: Math.max(0, timestampSeconds),
      question: question.trim(),
      options,
      correctOptionIndex,
      explanation: explanation.trim(),
    };

    let updatedList = [...quizzes];
    if (editingIndex !== null) {
      updatedList[editingIndex] = newQuiz;
      toast.success("Đã cập nhật câu hỏi dừng video!");
    } else {
      updatedList.push(newQuiz);
      toast.success(`Đã chèn câu hỏi dừng tại giây thứ ${timestampSeconds}s!`);
    }

    // Sort quizzes by timestampSeconds
    updatedList.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
    onChange(updatedList);

    // Reset Form
    resetForm();
  };

  const resetForm = () => {
    setQuestion("");
    setOptA("");
    setOptB("");
    setOptC("");
    setOptD("");
    setCorrectOptionIndex(0);
    setExplanation("");
    setEditingIndex(null);
  };

  const handleEditQuiz = (index: number) => {
    const q = quizzes[index];
    if (!q) return;

    setTimestampSeconds(q.timestampSeconds);
    setQuestion(q.question);
    setOptA(q.options[0] || "");
    setOptB(q.options[1] || "");
    setOptC(q.options[2] || "");
    setOptD(q.options[3] || "");
    setCorrectOptionIndex(q.correctOptionIndex);
    setExplanation(q.explanation);
    setEditingIndex(index);

    if (videoRef.current) {
      videoRef.current.currentTime = q.timestampSeconds;
    }
  };

  const handleDeleteQuiz = (index: number) => {
    const updated = quizzes.filter((_, i) => i !== index);
    onChange(updated);
    toast.success("Đã xóa câu hỏi dừng video.");
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Cấu hình Câu hỏi Kiểm thử Trực tiếp trên Video (In-Video Quizzes)
          </h4>
        </div>
        <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-semibold">
          {quizzes.length} mốc đã chèn
        </span>
      </div>

      {/* Video Preview with Capture Time */}
      {videoUrl && (
        <div className="space-y-2">
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-black relative shadow-md">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={captureCurrentTime}
              className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Lấy mốc giây hiện tại từ Video</span>
            </button>
          </div>
        </div>
      )}

      {/* Question Form */}
      <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {editingIndex !== null ? "Sửa câu hỏi chèn mốc" : "Thêm câu hỏi dừng màn hình mới"}
          </span>
          {editingIndex !== null && (
            <button
              type="button"
              onClick={resetForm}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Hủy sửa
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Mốc thời gian (Giây)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={timestampSeconds}
                onChange={(e) => setTimestampSeconds(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-bold"
                required
              />
              <span className="text-xs font-mono font-semibold text-slate-400">
                ({formatSeconds(timestampSeconds)})
              </span>
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Nội dung câu hỏi
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="VD: Hàm print() trong Python có tác dụng gì?"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
            />
          </div>
        </div>

        {/* 4 Options A/B/C/D */}
        <div className="space-y-2 pt-1">
          <label className="block text-[11px] font-bold text-slate-500">
            Các phương án trả lời (Tích chọn nút tròn cho Đáp án Đúng):
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <input
                type="radio"
                name="correctOption"
                checked={correctOptionIndex === 0}
                onChange={() => setCorrectOptionIndex(0)}
                className="w-4 h-4 text-blue-600 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-500">A.</span>
              <input
                type="text"
                value={optA}
                onChange={(e) => setOptA(e.target.value)}
                placeholder="Đáp án A"
                className="w-full bg-transparent text-xs outline-none"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <input
                type="radio"
                name="correctOption"
                checked={correctOptionIndex === 1}
                onChange={() => setCorrectOptionIndex(1)}
                className="w-4 h-4 text-blue-600 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-500">B.</span>
              <input
                type="text"
                value={optB}
                onChange={(e) => setOptB(e.target.value)}
                placeholder="Đáp án B"
                className="w-full bg-transparent text-xs outline-none"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <input
                type="radio"
                name="correctOption"
                checked={correctOptionIndex === 2}
                onChange={() => setCorrectOptionIndex(2)}
                className="w-4 h-4 text-blue-600 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-500">C.</span>
              <input
                type="text"
                value={optC}
                onChange={(e) => setOptC(e.target.value)}
                placeholder="Đáp án C (Tùy chọn)"
                className="w-full bg-transparent text-xs outline-none"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <input
                type="radio"
                name="correctOption"
                checked={correctOptionIndex === 3}
                onChange={() => setCorrectOptionIndex(3)}
                className="w-4 h-4 text-blue-600 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-500">D.</span>
              <input
                type="text"
                value={optD}
                onChange={(e) => setOptD(e.target.value)}
                placeholder="Đáp án D (Tùy chọn)"
                className="w-full bg-transparent text-xs outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">
            Lời giải thích chi tiết (Hiển thị sau khi học viên nộp bài)
          </label>
          <input
            type="text"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="VD: print() là hàm tích hợp sẵn của Python để ghi dữ liệu ra console."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleAddOrUpdateQuiz}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>{editingIndex !== null ? "Lưu cập nhật mốc" : "Chèn mốc câu hỏi vào Video"}</span>
          </button>
        </div>
      </div>

      {/* List of Inserted Markers */}
      {quizzes.length > 0 && (
        <div className="space-y-2 pt-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Danh sách các mốc dừng đã chèn ({quizzes.length}):
          </span>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {quizzes.map((q, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono font-extrabold text-xs">
                    ⏱️ {formatSeconds(q.timestampSeconds)} ({q.timestampSeconds}s)
                  </span>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {q.question}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{q.options.length} đáp án</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Đáp án đúng: {String.fromCharCode(65 + q.correctOptionIndex)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleEditQuiz(idx)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Sửa mốc câu hỏi"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuiz(idx)}
                    className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors cursor-pointer"
                    title="Xóa mốc câu hỏi"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
