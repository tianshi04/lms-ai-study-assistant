"use client";

import React, { useState, useRef } from "react";
import { useToast } from "@/components/ui/Toast";
import { Clock, Video, Plus, Trash2, Pencil } from "lucide-react";

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

export function InVideoQuizEditor({ videoUrl, quizzes, onChange }: InVideoQuizEditorProps) {
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

    const updatedList = [...quizzes];
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
    <div className="space-y-4 p-4 rounded-2xl bg-card border border-border">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Cấu hình Câu hỏi Kiểm thử Trực tiếp trên Video (In-Video Quizzes)
          </h4>
        </div>
        <span className="text-[11px] font-mono text-primary font-semibold">
          {quizzes.length} mốc đã chèn
        </span>
      </div>

      {/* Single Video Preview Player */}
      {videoUrl ? (
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
                className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/20 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-4 h-4" aria-hidden="true" />
                <span>Lấy mốc giây hiện tại từ Video</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-2xl bg-muted/40 text-muted-foreground text-xs shadow-2xs">
          <Video className="w-10 h-10 mb-2 text-muted-foreground" aria-hidden="true" />
          <span className="font-semibold text-foreground">Chưa có video được chọn</span>
          <span className="text-[10px] text-muted-foreground mt-1 font-medium text-center">
            Vui lòng nhập đường dẫn URL hoặc upload video ở trên để bắt đầu cấu hình In-Video Quiz.
          </span>
        </div>
      )}

      {/* Question Form */}
      <div className="bg-card p-4 rounded-xl border border-border space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">
            {editingIndex !== null ? "Sửa câu hỏi chèn mốc" : "Thêm câu hỏi dừng màn hình mới"}
          </span>
          {editingIndex !== null && (
            <button
              type="button"
              onClick={resetForm}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Hủy sửa
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
              Mốc thời gian (Giây)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={timestampSeconds}
                onChange={(e) => setTimestampSeconds(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-xs font-mono font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
              <span className="text-xs font-mono font-semibold text-muted-foreground">
                ({formatSeconds(timestampSeconds)})
              </span>
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
              Nội dung câu hỏi
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="VD: Hàm print() trong Python có tác dụng gì?"
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Dynamic Options List */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-bold text-muted-foreground">
              Phương án trả lời (Tích chọn nút tròn để chỉ định Đáp án Đúng):
            </label>
            <button
              type="button"
              onClick={handleAddOption}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>+ Thêm phương án</span>
            </button>
          </div>

          <div className="space-y-2">
            {optionsList.map((optText, idx) => {
              const letter = String.fromCharCode(65 + idx);
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg border border-border"
                >
                  <input
                    type="radio"
                    name="correctOption"
                    checked={correctOptionIndex === idx}
                    onChange={() => setCorrectOptionIndex(idx)}
                    className="w-4 h-4 text-primary cursor-pointer"
                  />
                  <span className="text-xs font-bold text-muted-foreground font-mono">
                    {letter}.
                  </span>
                  <input
                    type="text"
                    value={optText}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Nhập phương án ${letter}…`}
                    className="w-full bg-transparent text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded px-1"
                  />
                  {optionsList.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      title="Xóa phương án này"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1">
            Lời giải thích chi tiết (Hiển thị sau khi học viên nộp bài)
          </label>
          <input
            type="text"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="VD: print() là hàm tích hợp sẵn của Python để ghi dữ liệu ra console."
            className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleAddOrUpdateQuiz}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>{editingIndex !== null ? "Lưu cập nhật mốc" : "Chèn mốc câu hỏi vào Video"}</span>
          </button>
        </div>
      </div>

      {/* List of Inserted Markers */}
      {quizzes.length > 0 && (
        <div className="space-y-2 pt-2">
          <span className="text-xs font-bold text-foreground">
            Danh sách các mốc dừng đã chèn ({quizzes.length}):
          </span>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {quizzes.map((q, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-card border border-border shadow-2xs text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-mono font-extrabold text-xs flex items-center gap-1.5 border border-primary/20">
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>
                      {formatSeconds(q.timestampSeconds)} ({q.timestampSeconds}s)
                    </span>
                  </span>
                  <div>
                    <div className="font-bold text-foreground">{q.question}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>{q.options.length} đáp án</span>
                      <span>•</span>
                      <span className="text-success font-semibold">
                        Đáp án đúng: {String.fromCharCode(65 + q.correctOptionIndex)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleEditQuiz(idx)}
                    className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Sửa mốc câu hỏi"
                  >
                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuiz(idx)}
                    className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                    title="Xóa mốc câu hỏi"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
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
