"use client";

import { useEffect, useState } from "react";
import { ItemType } from "@/gen/catalog/v1/catalog_pb";
import { type QuestionBank } from "@/gen/assessment/v1/assessment_pb";
import { Modal } from "@/components/ui/Modal";
import { VideoUploadWidget } from "@/components/ui/VideoUploadWidget";
import { InVideoQuizEditor, type InVideoQuizItem } from "@/components/ui/InVideoQuizEditor";
import type { LearningItemPayload } from "../../hooks/useCourseBuilder";

interface LearningItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: LearningItemPayload) => Promise<boolean>;
  questionBanks: QuestionBank[];
  initialData?: Partial<LearningItemPayload>;
  isEdit?: boolean;
  saving: boolean;
}

export function LearningItemFormModal({
  isOpen,
  onClose,
  onSubmit,
  questionBanks,
  initialData,
  isEdit = false,
  saving,
}: LearningItemFormModalProps) {
  const [itemTitle, setItemTitle] = useState(initialData?.title || "");
  const [itemType, setItemType] = useState<ItemType>(initialData?.type || ItemType.VIDEO);
  const [itemMinutes, setItemMinutes] = useState(initialData?.estimatedMinutes || 10);

  // Video fields
  const [videoUrl, setVideoUrl] = useState(initialData?.videoUrl || "");
  const [vttSubtitleUrl, setVttSubtitleUrl] = useState(initialData?.vttSubtitleUrl || "");
  const [autoTranscribe, setAutoTranscribe] = useState(initialData?.autoTranscribe || false);
  const [inVideoQuizzes, setInVideoQuizzes] = useState<InVideoQuizItem[]>(
    initialData?.inVideoQuizzes || [],
  );

  // Reading fields
  const [readingMarkdown, setReadingMarkdown] = useState(initialData?.readingMarkdown || "");
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);

  // Lab fields
  const [labLanguage, setLabLanguage] = useState(initialData?.language || "python");
  const [labStarterCode, setLabStarterCode] = useState(
    initialData?.starterCode || "# Starter code for lab\ndef solution(a, b):\n    pass\n",
  );
  const [labTestCasesJson, setLabTestCasesJson] = useState(
    initialData?.testCasesJson || '[\n  {"input": "1, 2", "expected": "3"}\n]',
  );

  // Quiz Matrix fields
  const [quizBankId, setQuizBankId] = useState(initialData?.quizBankId || "");
  const [quizTimeLimit, setQuizTimeLimit] = useState<string | number>(
    initialData?.quizTimeLimit ?? "45",
  );
  const [quizPassingThreshold, setQuizPassingThreshold] = useState<string | number>(
    initialData?.quizPassingThreshold ?? "80",
  );
  const [quizEasyCount, setQuizEasyCount] = useState<string | number>(
    initialData?.quizEasyCount ?? "4",
  );
  const [quizMediumCount, setQuizMediumCount] = useState<string | number>(
    initialData?.quizMediumCount ?? "4",
  );
  const [quizHardCount, setQuizHardCount] = useState<string | number>(
    initialData?.quizHardCount ?? "2",
  );
  const [quizMaxAttempts, setQuizMaxAttempts] = useState<string | number>(
    initialData?.quizMaxAttempts ?? "3",
  );
  const [quizCooldownHours, setQuizCooldownHours] = useState<string | number>(
    initialData?.quizCooldownHours ?? "8",
  );

  // Peer review fields
  const [peerRubricJson, setPeerRubricJson] = useState(
    initialData?.rubricCriteriaJson ||
      '[\n  {"title": "Clarity & Organization", "max_score": 10}\n]',
  );

  useEffect(() => {
    if (initialData) {
      setItemTitle(initialData.title || "");
      setItemType(initialData.type || ItemType.VIDEO);
      setItemMinutes(initialData.estimatedMinutes || 10);
      setVideoUrl(initialData.videoUrl || "");
      setVttSubtitleUrl(initialData.vttSubtitleUrl || "");
      setAutoTranscribe(initialData.autoTranscribe || false);
      setInVideoQuizzes(initialData.inVideoQuizzes || []);
      setReadingMarkdown(initialData.readingMarkdown || "");
      setLabLanguage(initialData.language || "python");
      setLabStarterCode(
        initialData.starterCode || "# Starter code for lab\ndef solution(a, b):\n    pass\n",
      );
      setLabTestCasesJson(
        initialData.testCasesJson || '[\n  {"input": "1, 2", "expected": "3"}\n]',
      );
      setQuizBankId(initialData.quizBankId || "");
      setQuizTimeLimit(initialData.quizTimeLimit ?? 45);
      setQuizPassingThreshold(initialData.quizPassingThreshold ?? 80);
      setQuizEasyCount(initialData.quizEasyCount ?? 4);
      setQuizMediumCount(initialData.quizMediumCount ?? 4);
      setQuizHardCount(initialData.quizHardCount ?? 2);
      setQuizMaxAttempts(initialData.quizMaxAttempts ?? 3);
      setQuizCooldownHours(initialData.quizCooldownHours ?? 8);
      setPeerRubricJson(
        initialData.rubricCriteriaJson ||
          '[\n  {"title": "Clarity & Organization", "max_score": 10}\n]',
      );
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: LearningItemPayload = {
      lessonId: initialData?.lessonId || "",
      title: itemTitle,
      type: itemType,
      estimatedMinutes: itemMinutes,
      videoUrl,
      vttSubtitleUrl,
      autoTranscribe,
      inVideoQuizzes,
      readingMarkdown,
      starterCode: labStarterCode,
      testCasesJson: labTestCasesJson,
      language: labLanguage,
      rubricCriteriaJson: peerRubricJson,
      quizBankId,
      quizTimeLimit,
      quizPassingThreshold,
      quizEasyCount,
      quizMediumCount,
      quizHardCount,
      quizMaxAttempts,
      quizCooldownHours,
    };

    const success = await onSubmit(payload);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Chỉnh sửa nội dung Học liệu" : "Thêm Học liệu Mới vào Bài học"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              {"Tên Học liệu"}
            </label>
            <input
              type="text"
              value={itemTitle}
              onChange={(e) => setItemTitle(e.target.value)}
              placeholder={"Ví dụ: Video 1.1: Trực quan hóa thuật toán Descent Gradient"}
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              {"Loại nội dung"}
            </label>
            <select
              value={itemType}
              onChange={(e) => setItemType(Number(e.target.value) as ItemType)}
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value={ItemType.VIDEO}>{"VIDEO (Bài giảng Video)"}</option>
              <option value={ItemType.READING}>{"READING (Bài đọc Markdown)"}</option>
              <option value={ItemType.AUTO_GRADED_LAB}>{"AUTO_GRADED_LAB (Thực hành Code)"}</option>
              <option value={ItemType.PEER_REVIEW}>{"PEER_REVIEW (Đánh giá chéo)"}</option>
              <option value={ItemType.PRACTICE_QUIZ}>
                {"PRACTICE_QUIZ (Trắc nghiệm Luyện tập)"}
              </option>
              <option value={ItemType.GRADED_QUIZ}>{"GRADED_QUIZ (Trắc nghiệm Tính điểm)"}</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            {"Thời lượng ước tính hoàn thành (Phút)"}
          </label>
          <input
            type="number"
            min={1}
            value={itemMinutes}
            onChange={(e) => setItemMinutes(parseInt(e.target.value) || 1)}
            className="w-full px-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          />
        </div>

        {/* Dynamic Form Sections based on Item Type */}
        {itemType === ItemType.VIDEO && (
          <div className="space-y-4 pt-2 border-t border-border">
            <VideoUploadWidget
              value={videoUrl}
              onChange={(url) => setVideoUrl(url)}
              folder="videos"
              label="Học liệu Video Bài giảng (Upload Tệp hoặc Đường dẫn)"
            />
            <VideoUploadWidget
              value={vttSubtitleUrl}
              onChange={(url) => setVttSubtitleUrl(url)}
              folder="subtitles"
              accept=".vtt,text/vtt"
              label="Phụ đề cho Video (định dạng .vtt)"
              placeholder="https://…"
            />
            <InVideoQuizEditor
              videoUrl={videoUrl}
              quizzes={inVideoQuizzes}
              onChange={(updated) => setInVideoQuizzes(updated)}
            />
          </div>
        )}

        {itemType === ItemType.READING && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {"Nội dung Bài đọc (Định dạng Markdown)"}
              </label>
              <button
                type="button"
                onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
                className="text-xs text-primary font-semibold hover:underline cursor-pointer"
              >
                {showMarkdownPreview ? "Sửa Markdown" : "Xem trước Markdown"}
              </button>
            </div>
            {showMarkdownPreview ? (
              <div className="p-4 rounded-xl border border-border bg-card text-foreground text-sm prose dark:prose-invert max-w-none min-h-[160px]">
                {readingMarkdown || "(Chưa có nội dung)"}
              </div>
            ) : (
              <textarea
                rows={8}
                value={readingMarkdown}
                onChange={(e) => setReadingMarkdown(e.target.value)}
                placeholder={"Nhập nội dung giáo trình bài đọc bằng định dạng Markdown…"}
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            )}
          </div>
        )}

        {itemType === ItemType.AUTO_GRADED_LAB && (
          <div className="space-y-4 pt-2 border-t border-border">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                {"Ngôn ngữ lập trình"}
              </label>
              <select
                value={labLanguage}
                onChange={(e) => setLabLanguage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="python">Python 3</option>
                <option value="javascript">JavaScript (Node.js)</option>
                <option value="cpp">C++</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                {"Code mẫu ban đầu (Starter Code)"}
              </label>
              <textarea
                rows={4}
                value={labStarterCode}
                onChange={(e) => setLabStarterCode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                {"Test Cases (JSON Format)"}
              </label>
              <textarea
                rows={4}
                value={labTestCasesJson}
                onChange={(e) => setLabTestCasesJson(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        )}

        {(itemType === ItemType.PRACTICE_QUIZ || itemType === ItemType.GRADED_QUIZ) && (
          <div className="space-y-4 pt-2 border-t border-border">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                {"Ngân hàng Câu hỏi liên kết"}
              </label>
              <select
                value={quizBankId}
                onChange={(e) => setQuizBankId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">{"-- Chọn Ngân hàng Câu hỏi --"}</option>
                {questionBanks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.title} ({bank.questions?.length || 0} câu hỏi)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                  {"Thời gian (phút)"}
                </label>
                <input
                  type="number"
                  value={quizTimeLimit}
                  onChange={(e) => setQuizTimeLimit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-card text-foreground text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                  {"Điểm đạt (%)"}
                </label>
                <input
                  type="number"
                  value={quizPassingThreshold}
                  onChange={(e) => setQuizPassingThreshold(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-card text-foreground text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                  {"Số lần làm tối đa"}
                </label>
                <input
                  type="number"
                  value={quizMaxAttempts}
                  onChange={(e) => setQuizMaxAttempts(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-card text-foreground text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                  {"Thời gian chờ (Giờ)"}
                </label>
                <input
                  type="number"
                  value={quizCooldownHours}
                  onChange={(e) => setQuizCooldownHours(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-card text-foreground text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-success mb-1">
                  {"Số câu Dễ"}
                </label>
                <input
                  type="number"
                  value={quizEasyCount}
                  onChange={(e) => setQuizEasyCount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-card text-foreground text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-warning mb-1">
                  {"Số câu Trung bình"}
                </label>
                <input
                  type="number"
                  value={quizMediumCount}
                  onChange={(e) => setQuizMediumCount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-card text-foreground text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-destructive mb-1">
                  {"Số câu Khó"}
                </label>
                <input
                  type="number"
                  value={quizHardCount}
                  onChange={(e) => setQuizHardCount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-card text-foreground text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {itemType === ItemType.PEER_REVIEW && (
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {"Tiêu chí chấm điểm Peer Review (JSON Format)"}
            </label>
            <textarea
              rows={5}
              value={peerRubricJson}
              onChange={(e) => setPeerRubricJson(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-muted text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
          >
            {"Hủy"}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary-hover text-primary-foreground shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            <span aria-live="polite">
              {saving ? "Đang lưu…" : isEdit ? "Cập nhật Học liệu" : "Xác nhận tạo Học liệu"}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
