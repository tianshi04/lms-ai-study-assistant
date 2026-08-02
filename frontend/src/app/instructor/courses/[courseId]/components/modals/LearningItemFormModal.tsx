"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ItemType } from "@/gen/catalog/v1/catalog_pb";
import { type QuestionBank } from "@/gen/assessment/v1/assessment_pb";
import { Modal } from "@/components/ui/Modal";
import { VideoUploadWidget } from "@/components/ui/VideoUploadWidget";
import { InVideoQuizEditor, type InVideoQuizItem } from "@/components/ui/InVideoQuizEditor";
import type { LearningItemPayload } from "../../hooks/useCourseBuilder";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import {
  Code,
  FileText,
  HelpCircle,
  Video as VideoIcon,
  Users,
  CheckCircle2,
  Eye,
  Edit3,
} from "lucide-react";

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

  // Lab fields
  const [labLanguage, setLabLanguage] = useState(initialData?.language || "python");
  const [labStarterCode, setLabStarterCode] = useState(
    initialData?.starterCode || "# Starter code for lab\ndef solution(a, b):\n    return a + b\n",
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
        initialData.starterCode ||
          "# Starter code for lab\ndef solution(a, b):\n    return a + b\n",
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
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col">
        {/* Pinned Top Basic Info Section (Always Visible) */}
        <div className="bg-muted/40 p-3.5 rounded-xl border border-border/80 mb-3 space-y-2 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                Tên Học liệu <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
                placeholder="Hãy điền tên học liệu"
                className="w-full px-3.5 py-2 rounded-xl border border-input bg-card text-foreground text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-2xs"
                required
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                Loại nội dung
              </label>
              <Select
                value={String(itemType)}
                onValueChange={(val) => {
                  if (val) setItemType(Number(val) as ItemType);
                }}
              >
                <SelectTrigger className="w-full bg-card shadow-2xs">
                  <SelectValue placeholder="Chọn loại nội dung">
                    {itemType === ItemType.VIDEO
                      ? "🎬 VIDEO (Bài giảng Video)"
                      : itemType === ItemType.READING
                        ? "📖 READING (Bài đọc Markdown)"
                        : itemType === ItemType.AUTO_GRADED_LAB
                          ? "💻 AUTO_GRADED_LAB (Thực hành Code)"
                          : itemType === ItemType.PEER_REVIEW
                            ? "👥 PEER_REVIEW (Đánh giá chéo)"
                            : itemType === ItemType.PRACTICE_QUIZ
                              ? "✏️ PRACTICE_QUIZ (Trắc nghiệm Luyện tập)"
                              : itemType === ItemType.GRADED_QUIZ
                                ? "🏆 GRADED_QUIZ (Trắc nghiệm Tính điểm)"
                                : ""}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(ItemType.VIDEO)}>🎬 VIDEO (Bài giảng Video)</SelectItem>
                  <SelectItem value={String(ItemType.READING)}>
                    📖 READING (Bài đọc Markdown)
                  </SelectItem>
                  <SelectItem value={String(ItemType.AUTO_GRADED_LAB)}>
                    💻 AUTO_GRADED_LAB (Thực hành Code)
                  </SelectItem>
                  <SelectItem value={String(ItemType.PEER_REVIEW)}>
                    👥 PEER_REVIEW (Đánh giá chéo)
                  </SelectItem>
                  <SelectItem value={String(ItemType.PRACTICE_QUIZ)}>
                    ✏️ PRACTICE_QUIZ (Trắc nghiệm Luyện tập)
                  </SelectItem>
                  <SelectItem value={String(ItemType.GRADED_QUIZ)}>
                    🏆 GRADED_QUIZ (Trắc nghiệm Tính điểm)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                Thời lượng (phút)
              </label>
              <input
                type="number"
                min={1}
                value={itemMinutes}
                onChange={(e) => setItemMinutes(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-card text-foreground text-sm font-semibold text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-2xs"
                required
              />
            </div>
          </div>
        </div>

        {/* Scrollable Main Body Content Area */}
        <div className="max-h-[62vh] overflow-y-auto pr-1 space-y-4">
          {/* Dynamic Form Sections based on Item Type */}
          {itemType === ItemType.VIDEO && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Video & Subtitle Uploads */}
              <div className="lg:col-span-5 space-y-4 bg-card p-4 rounded-2xl border border-border shadow-2xs">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <VideoIcon className="w-4 h-4 text-primary" aria-hidden="true" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Tệp Video & Phụ đề VTT
                  </h4>
                </div>

                <VideoUploadWidget
                  value={videoUrl}
                  onChange={(url) => setVideoUrl(url)}
                  folder="videos"
                  label="Video Bài giảng"
                  compact={true}
                />

                <VideoUploadWidget
                  value={vttSubtitleUrl}
                  onChange={(url) => setVttSubtitleUrl(url)}
                  folder="subtitles"
                  accept=".vtt,text/vtt"
                  label="Phụ đề Video"
                  placeholder="https://…"
                  compact={true}
                />
              </div>

              {/* Right Column: In-Video Quiz Builder */}
              <div className="lg:col-span-7">
                <InVideoQuizEditor
                  videoUrl={videoUrl}
                  quizzes={inVideoQuizzes}
                  onChange={(updated) => setInVideoQuizzes(updated)}
                />
              </div>
            </div>
          )}

          {itemType === ItemType.READING && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {/* Left Column: Markdown Editor */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-primary" aria-hidden="true" />
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Nội dung Soạn thảo (Markdown)
                  </label>
                </div>
                <textarea
                  rows={13}
                  value={readingMarkdown}
                  onChange={(e) => setReadingMarkdown(e.target.value)}
                  placeholder="Nhập nội dung bài đọc định dạng Markdown tại đây...&#10;&#10;# Tiêu đề bài đọc&#10;- Ý chính 1&#10;- Ý chính 2"
                  className="w-full p-4 rounded-2xl border border-input bg-card text-foreground text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-2xs"
                />
              </div>

              {/* Right Column: Live Rendered Preview */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" aria-hidden="true" />
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Xem trước Giao diện (Live Preview)
                  </label>
                </div>
                <div className="p-4 rounded-2xl border border-border bg-card text-foreground text-sm prose dark:prose-invert max-w-none min-h-[300px] max-h-[360px] overflow-y-auto shadow-2xs">
                  {readingMarkdown ? (
                    <ReactMarkdown>{readingMarkdown}</ReactMarkdown>
                  ) : (
                    <div className="text-muted-foreground text-xs italic flex flex-col items-center justify-center py-12">
                      <FileText className="w-8 h-8 mb-2 opacity-40" />
                      Nội dung Markdown xem trước sẽ hiển thị trực tiếp ở đây.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {itemType === ItemType.AUTO_GRADED_LAB && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-card p-3 rounded-xl border border-border">
                <Code className="w-4 h-4 text-primary" aria-hidden="true" />
                <label className="text-xs font-bold uppercase tracking-wider text-foreground shrink-0">
                  Ngôn ngữ lập trình:
                </label>
                <div className="w-48">
                  <Select
                    value={labLanguage}
                    onValueChange={(val) => {
                      if (val) setLabLanguage(val as string);
                    }}
                  >
                    <SelectTrigger className="w-full bg-card">
                      <SelectValue placeholder="Chọn ngôn ngữ">
                        {labLanguage === "python"
                          ? "Python 3"
                          : labLanguage === "javascript"
                            ? "JavaScript (Node.js)"
                            : labLanguage === "cpp"
                              ? "C++"
                              : labLanguage}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="python">Python 3</SelectItem>
                      <SelectItem value="javascript">JavaScript (Node.js)</SelectItem>
                      <SelectItem value="cpp">C++</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 2 Columns: Starter Code & Test Cases */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Code mẫu ban đầu (Starter Code)
                  </label>
                  <textarea
                    rows={10}
                    value={labStarterCode}
                    onChange={(e) => setLabStarterCode(e.target.value)}
                    className="w-full p-3.5 rounded-2xl border border-input bg-card text-foreground text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-2xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Cấu hình Test Cases (Định dạng JSON)
                  </label>
                  <textarea
                    rows={10}
                    value={labTestCasesJson}
                    onChange={(e) => setLabTestCasesJson(e.target.value)}
                    className="w-full p-3.5 rounded-2xl border border-input bg-card text-foreground text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-2xs"
                  />
                </div>
              </div>
            </div>
          )}

          {(itemType === ItemType.PRACTICE_QUIZ || itemType === ItemType.GRADED_QUIZ) && (
            <div className="space-y-4">
              <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                  Ngân hàng Câu hỏi liên kết
                </label>
                <Select
                  value={quizBankId}
                  onValueChange={(val) => {
                    setQuizBankId((val as string) || "");
                  }}
                >
                  <SelectTrigger className="w-full bg-card">
                    <SelectValue placeholder="-- Chọn Ngân hàng Câu hỏi --">
                      {(() => {
                        const bank = questionBanks.find((b) => b.id === quizBankId);
                        return bank
                          ? `${bank.title} (${bank.questions?.length || 0} câu hỏi trong ngân hàng)`
                          : "-- Chọn Ngân hàng Câu hỏi --";
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-- Chọn Ngân hàng Câu hỏi --</SelectItem>
                    {questionBanks.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {`${bank.title} (${bank.questions?.length || 0} câu hỏi)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Execution Rules */}
                <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-border pb-2">
                    <HelpCircle className="w-4 h-4 text-primary" aria-hidden="true" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Cấu hình Quy chế Bài thi
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                        Thời gian (phút)
                      </label>
                      <input
                        type="number"
                        value={quizTimeLimit}
                        onChange={(e) => setQuizTimeLimit(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-input bg-card text-foreground text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                        Điểm đạt (%)
                      </label>
                      <input
                        type="number"
                        value={quizPassingThreshold}
                        onChange={(e) => setQuizPassingThreshold(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-input bg-card text-foreground text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                        Số lần làm tối đa
                      </label>
                      <input
                        type="number"
                        value={quizMaxAttempts}
                        onChange={(e) => setQuizMaxAttempts(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-input bg-card text-foreground text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                        Thời gian chờ (Giờ)
                      </label>
                      <input
                        type="number"
                        value={quizCooldownHours}
                        onChange={(e) => setQuizCooldownHours(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-input bg-card text-foreground text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Card 2: Question Distribution */}
                <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-border pb-2">
                    <CheckCircle2 className="w-4 h-4 text-success" aria-hidden="true" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Phân bổ Số lượng Câu hỏi
                    </h4>
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-success mb-1">
                        Số câu Dễ
                      </label>
                      <input
                        type="number"
                        value={quizEasyCount}
                        onChange={(e) => setQuizEasyCount(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-input bg-card text-foreground text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-warning mb-1">
                        Số câu Trung bình
                      </label>
                      <input
                        type="number"
                        value={quizMediumCount}
                        onChange={(e) => setQuizMediumCount(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-input bg-card text-foreground text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-destructive mb-1">
                        Số câu Khó
                      </label>
                      <input
                        type="number"
                        value={quizHardCount}
                        onChange={(e) => setQuizHardCount(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-input bg-card text-foreground text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {itemType === ItemType.PEER_REVIEW && (
            <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs space-y-3">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <Users className="w-4 h-4 text-primary" aria-hidden="true" />
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                  Tiêu chí chấm điểm Peer Review (Cấu hình JSON)
                </label>
              </div>
              <textarea
                rows={8}
                value={peerRubricJson}
                onChange={(e) => setPeerRubricJson(e.target.value)}
                className="w-full p-4 rounded-xl border border-input bg-card text-foreground text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          )}
        </div>

        {/* Fixed Footer Buttons */}
        <div className="flex justify-end gap-3 pt-3 border-t border-border mt-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-muted text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
          >
            Hủy
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
