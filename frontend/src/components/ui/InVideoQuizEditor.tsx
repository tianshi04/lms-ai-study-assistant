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
  const [optionsList, setOptionsList] = useState<string[]>(["", ""]);
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

  const handleAddOption = () => {
    if (optionsList.length >= 6) {
      toast.error("Tối đa 6 phương án cho mỗi câu hỏi dừng video.");
      return;
    }
    setOptionsList((prev) => [...prev, ""]);
  };

  const handleRemoveOption = (idx: number) => {
    if (optionsList.length <= 2) {
      toast.error("Cần tối thiểu 2 phương án trả lời.");
      return;
    }
    const updated = optionsList.filter((_, i) => i !== idx);
    setOptionsList(updated);
    if (correctOptionIndex >= updated.length) {
      setCorrectOptionIndex(0);
    }
  };

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...optionsList];
    updated[idx] = val;
    setOptionsList(updated);
  };

  const handleAddOrUpdateQuiz = (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      toast.error("Vui lòng nhập nội dung câu hỏi.");
      return;
    }

    const trimmedOptions = optionsList.map((o) => o.trim()).filter((o) => o.length > 0);
    if (trimmedOptions.length < 2) {
      toast.error("Vui lòng nhập tối thiểu 2 đáp án hợp lệ.");
      return;
    }

    const finalCorrectIndex = correctOptionIndex < trimmedOptions.length ? correctOptionIndex : 0;

    const newQuiz: InVideoQuizItem = {
      timestampSeconds: Math.max(0, timestampSeconds),
      question: question.trim(),
      options: trimmedOptions,
      correctOptionIndex: finalCorrectIndex,
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
    setOptionsList(["", ""]);
    setCorrectOptionIndex(0);
    setExplanation("");
    setEditingIndex(null);
  };

  const handleEditQuiz = (index: number) => {
    const q = quizzes[index];
    if (!q) return;

    setTimestampSeconds(q.timestampSeconds);
    setQuestion(q.question);
    setOptionsList(q.options.length >= 2 ? [...q.options] : ["", ""]);
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

  const isYouTubeUrl = (url: string) => {
    return url.includes("youtube.com") || url.includes("youtu.be");
  };

  const getYouTubeEmbedUrl = (url: string) => {
    let videoId = "";
    if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1]?.split("?")[0] || "";
    } else if (url.includes("watch?v=")) {
      videoId = url.split("watch?v=")[1]?.split("&")[0] || "";
    } else if (url.includes("embed/")) {
      videoId = url.split("embed/")[1]?.split("?")[0] || "";
    }
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
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

      {/* Single Video Preview Player */}
      {videoUrl && (
        <div className="space-y-2">
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-black relative shadow-md">
            {isYouTubeUrl(videoUrl) ? (
              <iframe
                src={getYouTubeEmbedUrl(videoUrl)}
                title="YouTube Video Preview"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            ) : (
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="w-full h-full object-contain"
              />
            )}
          </div>
          {!isYouTubeUrl(videoUrl) && (
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
          )}
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

        {/* Dynamic Options List */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-bold text-slate-500">
              Phương án trả lời (Tích chọn nút tròn để chỉ định Đáp án Đúng):
            </label>
            <button
              type="button"
              onClick={handleAddOption}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Thêm phương án</span>
            </button>
          </div>

          <div className="space-y-2">
            {optionsList.map((optText, idx) => {
              const letter = String.fromCharCode(65 + idx);
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <input
                    type="radio"
                    name="correctOption"
                    checked={correctOptionIndex === idx}
                    onChange={() => setCorrectOptionIndex(idx)}
                    className="w-4 h-4 text-blue-600 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-500 font-mono">{letter}.</span>
                  <input
                    type="text"
                    value={optText}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Nhập phương án ${letter}...`}
                    className="w-full bg-transparent text-xs outline-none"
                  />
                  {optionsList.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Xóa phương án này"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
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
