"use client";

import { useEffect, useState } from "react";
import { renderMarkdown } from "@/components/ai/AIChatMarkdownRenderer";
import { ItemType } from "@/gen/catalog/v1/catalog_pb";
import { type QuestionBank } from "@/gen/assessment/v1/assessment_pb";
import { Dialog } from "@/components/ui/Dialog";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { VideoUploadWidget } from "@/components/course/VideoUploadWidget";
import { InVideoQuizEditor, type InVideoQuizItem } from "@/components/course/InVideoQuizEditor";
import type { LearningItemPayload } from "../../hooks/useCourseBuilder";
import { Select } from "@/components/ui/Select";

import {
  Code,
  FileText,
  HelpCircle,
  Video as VideoIcon,
  Users,
  CheckCircle2,
  Eye,
  Edit3,
  Info,
  AlertTriangle,
  FileCode,
  BookOpen,
  Terminal,
  Award,
  Pencil,
} from "lucide-react";

/** Decode double-encoded JSON strings (e.g. '"[...]"' → '[...]') */
function normalizeJson(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  try {
    let parsed = JSON.parse(raw);
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    return typeof parsed === "object" ? JSON.stringify(parsed, null, 2) : raw;
  } catch {
    return raw;
  }
}

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
    normalizeJson(initialData?.testCasesJson, '[\n  {"input": "1, 2", "expected": "3"}\n]'),
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
        normalizeJson(initialData.testCasesJson, '[\n  {"input": "1, 2", "expected": "3"}\n]'),
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

  const [labError, setLabError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLabError("");

    // ── Lab validation & auto-hidden ──
    let finalTestCasesJson = labTestCasesJson;
    if (itemType === ItemType.AUTO_GRADED_LAB) {
      try {
        let testCases = JSON.parse(labTestCasesJson);
        if (!Array.isArray(testCases)) {
          setLabError("Test cases phải là một mảng JSON hợp lệ.");
          return;
        }
        if (testCases.length < 3) {
          setLabError(
            `Cần ít nhất 3 test cases (hiện có ${testCases.length}). Thêm test case để đảm bảo chất lượng chấm bài.`,
          );
          return;
        }
        // Auto-assign hidden: if GV didn't mark any as hidden, auto-hide the last ~1/3
        const hasAnyHidden = testCases.some((tc: { is_hidden?: boolean }) => tc.is_hidden === true);
        if (!hasAnyHidden) {
          const hiddenStartIndex = Math.ceil((testCases.length * 2) / 3); // last ~1/3
          testCases = testCases.map((tc: Record<string, unknown>, i: number) => ({
            ...tc,
            is_hidden: i >= hiddenStartIndex,
          }));
        }
        finalTestCasesJson = JSON.stringify(testCases, null, 2);
        setLabTestCasesJson(finalTestCasesJson);
      } catch {
        setLabError("Test cases JSON không hợp lệ. Vui lòng kiểm tra lại cú pháp.");
        return;
      }
    }

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
      testCasesJson: finalTestCasesJson,
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
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Content size="2xl">
        <Dialog.Header>
          <Dialog.Title>
            {isEdit ? "Chỉnh sửa nội dung Học liệu" : "Thêm Học liệu Mới vào Bài học"}
          </Dialog.Title>
        </Dialog.Header>
        <form onSubmit={handleSubmit} className="flex flex-col pt-2">
          {/* Pinned Top Basic Info Section (Always Visible) */}
          <div className="bg-muted/40 p-3.5 rounded-xl border border-border/80 mb-3 space-y-2 shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-5">
                <Input
                  label="Tên Học liệu"
                  type="text"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="Hãy điền tên học liệu"
                  className="w-full bg-card font-semibold shadow-2xs"
                  required
                />
              </div>

              <div className="sm:col-span-5">
                <label
                  htmlFor="itemTypeSelect"
                  className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1"
                >
                  Loại nội dung
                </label>
                <Select
                  value={String(itemType)}
                  onValueChange={(val) => {
                    if (val) setItemType(Number(val) as ItemType);
                  }}
                >
                  <Select.Trigger
                    id="itemTypeSelect"
                    aria-label="Loại nội dung"
                    className="w-full bg-card shadow-2xs"
                  >
                    <Select.Value placeholder="Chọn loại nội dung">
                      <span className="inline-flex items-center gap-1.5 truncate">
                        {itemType === ItemType.VIDEO ? (
                          <>
                            <VideoIcon className="w-3.5 h-3.5 shrink-0" /> Bài giảng Video
                          </>
                        ) : itemType === ItemType.READING ? (
                          <>
                            <BookOpen className="w-3.5 h-3.5 shrink-0" /> Bài đọc Markdown
                          </>
                        ) : itemType === ItemType.AUTO_GRADED_LAB ? (
                          <>
                            <Terminal className="w-3.5 h-3.5 shrink-0" /> Thực hành Code
                          </>
                        ) : itemType === ItemType.PEER_REVIEW ? (
                          <>
                            <Users className="w-3.5 h-3.5 shrink-0" /> Đánh giá chéo
                          </>
                        ) : itemType === ItemType.PRACTICE_QUIZ ? (
                          <>
                            <Pencil className="w-3.5 h-3.5 shrink-0" /> Quiz Luyện tập
                          </>
                        ) : itemType === ItemType.GRADED_QUIZ ? (
                          <>
                            <Award className="w-3.5 h-3.5 shrink-0" /> Quiz Tính điểm
                          </>
                        ) : (
                          ""
                        )}
                      </span>
                    </Select.Value>
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value={String(ItemType.VIDEO)}>
                      <span className="inline-flex items-center gap-1.5">
                        <VideoIcon className="w-3.5 h-3.5" /> Bài giảng Video
                      </span>
                    </Select.Item>
                    <Select.Item value={String(ItemType.READING)}>
                      <span className="inline-flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" /> Bài đọc Markdown
                      </span>
                    </Select.Item>
                    <Select.Item value={String(ItemType.AUTO_GRADED_LAB)}>
                      <span className="inline-flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5" /> Thực hành Code
                      </span>
                    </Select.Item>
                    <Select.Item value={String(ItemType.PEER_REVIEW)}>
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Đánh giá chéo
                      </span>
                    </Select.Item>
                    <Select.Item value={String(ItemType.PRACTICE_QUIZ)}>
                      <span className="inline-flex items-center gap-1.5">
                        <Pencil className="w-3.5 h-3.5" /> Quiz Luyện tập
                      </span>
                    </Select.Item>
                    <Select.Item value={String(ItemType.GRADED_QUIZ)}>
                      <span className="inline-flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" /> Quiz Tính điểm
                      </span>
                    </Select.Item>
                  </Select.Content>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Thời lượng (phút)"
                  type="number"
                  inputMode="numeric"
                  enterKeyHint="next"
                  min={1}
                  value={itemMinutes}
                  onChange={(e) => setItemMinutes(parseInt(e.target.value) || 1)}
                  className="w-full bg-card font-semibold text-center shadow-2xs"
                  required
                />
              </div>
            </div>
          </div>

          {/* Scrollable Main Body Content Area */}
          <div className="max-h-[62vh] overflow-y-auto px-3 space-y-4">
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
                    <label
                      htmlFor="readingMarkdown"
                      className="block text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Nội dung Soạn thảo (Markdown)
                    </label>
                  </div>
                  <Textarea
                    id="readingMarkdown"
                    rows={13}
                    value={readingMarkdown}
                    onChange={(e) => setReadingMarkdown(e.target.value)}
                    placeholder="Nhập nội dung bài đọc định dạng Markdown tại đây…&#10;&#10;# Tiêu đề bài đọc&#10;- Ý chính 1&#10;- Ý chính 2"
                    className="w-full font-mono shadow-2xs"
                  />
                </div>

                {/* Right Column: Live Rendered Preview */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" aria-hidden="true" />
                    <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Xem trước Giao diện (Live Preview)
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl border border-border bg-card text-foreground text-sm prose dark:prose-invert max-w-none min-h-[300px] max-h-[360px] overflow-y-auto shadow-2xs">
                    {readingMarkdown ? (
                      renderMarkdown(readingMarkdown)
                    ) : (
                      <div className="text-muted-foreground text-xs italic flex flex-col items-center justify-center py-12">
                        <FileText aria-hidden="true" className="w-8 h-8 mb-2 opacity-40" />
                        Nội dung Markdown xem trước sẽ hiển thị trực tiếp ở đây.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {itemType === ItemType.AUTO_GRADED_LAB && (
              <div className="space-y-5">
                {/* ─── 1. Mô tả đề bài ─── */}
                <div className="space-y-2">
                  <label
                    htmlFor="lab-markdown-input"
                    className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Mô tả đề bài (Markdown)
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Viết yêu cầu bài lab, công thức, ràng buộc, ví dụ input/output. Học viên sẽ thấy
                    nội dung này.
                  </p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        <Edit3 className="w-3 h-3" /> Soạn thảo
                      </div>
                      <Textarea
                        id="lab-markdown-input"
                        rows={8}
                        value={readingMarkdown}
                        onChange={(e) => setReadingMarkdown(e.target.value)}
                        placeholder={`## Mô tả
Viết hàm tính Mean Squared Error (MSE).

## Công thức
MSE = (1/N) × Σ(y_true[i] - y_pred[i])²

## Ví dụ
Input:  y_true=[1,2,3], y_pred=[1,2,3]
Output: 0.0

## Ràng buộc
- 1 ≤ len(y_true) ≤ 1000
- Giá trị float trong khoảng [-1000, 1000]`}
                        className="w-full flex-1 font-mono text-xs shadow-2xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        <Eye className="w-3 h-3" /> Xem trước
                      </div>
                      <div className="flex-1 p-3 rounded-xl border border-border bg-card text-sm overflow-y-auto prose prose-sm dark:prose-invert">
                        {readingMarkdown ? (
                          renderMarkdown(readingMarkdown)
                        ) : (
                          <span className="text-muted-foreground italic text-xs">
                            Nhập mô tả bên trái để xem trước…
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─── 2. Ngôn ngữ + Starter Code ─── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-card p-3 rounded-xl border border-border">
                    <Code className="w-4 h-4 text-primary" aria-hidden="true" />
                    <label
                      htmlFor="labLanguage"
                      className="text-xs font-bold uppercase tracking-wider text-foreground shrink-0"
                    >
                      Ngôn ngữ lập trình:
                    </label>
                    <div className="w-48">
                      <Select
                        value={labLanguage}
                        onValueChange={(val) => {
                          if (val) setLabLanguage(val as string);
                        }}
                      >
                        <Select.Trigger
                          id="labLanguage"
                          aria-label="Ngôn ngữ lập trình"
                          className="w-full bg-card"
                        >
                          <Select.Value placeholder="Chọn ngôn ngữ">
                            {labLanguage === "python"
                              ? "Python 3"
                              : labLanguage === "javascript"
                                ? "JavaScript (Node.js)"
                                : labLanguage === "cpp"
                                  ? "C++"
                                  : labLanguage}
                          </Select.Value>
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="python">Python 3</Select.Item>
                          <Select.Item value="javascript">JavaScript (Node.js)</Select.Item>
                          <Select.Item value="cpp">C++</Select.Item>
                        </Select.Content>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="lab-starter-code-input"
                      className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5"
                    >
                      <Code className="w-3.5 h-3.5 text-primary" />
                      Code mẫu ban đầu (Starter Code)
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Code mà học viên sẽ thấy khi mở bài lab. Nên chứa tên hàm, docstring, và
                      placeholder.
                    </p>
                    <Textarea
                      id="lab-starter-code-input"
                      rows={8}
                      value={labStarterCode}
                      onChange={(e) => setLabStarterCode(e.target.value)}
                      className="w-full font-mono text-xs shadow-2xs"
                    />
                  </div>
                </div>

                {/* ─── 3. Test Cases Builder ─── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                      Bộ Test Cases
                    </span>
                    <Button
                      type="button"
                      variant="outlined"
                      size="sm"
                      onClick={() => {
                        try {
                          const current = JSON.parse(labTestCasesJson);
                          const updated = [
                            ...current,
                            { input: "", expected_output: "", is_hidden: false },
                          ];
                          setLabTestCasesJson(JSON.stringify(updated, null, 2));
                        } catch {
                          setLabTestCasesJson(
                            '[{"input": "", "expected_output": "", "is_hidden": false}]',
                          );
                        }
                      }}
                    >
                      + Thêm Test Case
                    </Button>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    <strong>Visible</strong>: Học viên thấy input + expected trước khi submit.{" "}
                    <strong>Hidden</strong>: Chỉ chạy khi chấm, học viên không biết nội dung.
                  </p>

                  {/* Visual Builder */}
                  <div className="space-y-2">
                    {(() => {
                      let testCases: Array<{
                        input?: string;
                        expected_output?: string;
                        expected?: string;
                        is_hidden?: boolean;
                      }> = [];
                      try {
                        testCases = JSON.parse(labTestCasesJson);
                      } catch {
                        /* empty */
                      }
                      if (!Array.isArray(testCases)) testCases = [];

                      const updateTC = (index: number, field: string, value: string | boolean) => {
                        const updated = [...testCases];
                        updated[index] = { ...updated[index], [field]: value };
                        setLabTestCasesJson(JSON.stringify(updated, null, 2));
                      };
                      const removeTC = (index: number) => {
                        const updated = testCases.filter((_, i) => i !== index);
                        setLabTestCasesJson(JSON.stringify(updated.length ? updated : [], null, 2));
                      };

                      return testCases.map((tc, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl border border-border bg-card space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-foreground">
                              Test Case #{i + 1}
                            </span>
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={tc.is_hidden || false}
                                onCheckedChange={(checked) => updateTC(i, "is_hidden", !!checked)}
                                label={tc.is_hidden ? "Hidden" : "Visible"}
                              />
                              <Button
                                type="button"
                                variant="text"
                                size="xs"
                                onClick={() => removeTC(i)}
                                className="text-destructive hover:text-destructive/80 text-xs font-medium px-2"
                              >
                                ✕ Xóa
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Input
                              label="Input (đối số hàm)"
                              value={tc.input || ""}
                              onChange={(e) => updateTC(i, "input", e.target.value)}
                              placeholder="Ví dụ: [1, 2, 3], [4, 5, 6]"
                              className="font-mono text-xs"
                            />
                            <Input
                              label="Expected Output"
                              value={tc.expected_output || tc.expected || ""}
                              onChange={(e) => updateTC(i, "expected_output", e.target.value)}
                              placeholder="Ví dụ: 0.0"
                              className="font-mono text-xs"
                            />
                          </div>
                        </div>
                      ));
                    })()}
                  </div>

                  {/* Raw JSON toggle */}
                  <details className="text-xs">
                    <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                      <FileCode className="w-3 h-3 inline" /> Xem/sửa JSON thô
                    </summary>
                    <Textarea
                      rows={6}
                      value={labTestCasesJson}
                      onChange={(e) => setLabTestCasesJson(e.target.value)}
                      className="w-full font-mono text-xs shadow-2xs mt-2"
                    />
                  </details>

                  {/* Auto-hidden info */}
                  <p className="text-[11px] text-muted-foreground bg-muted/50 p-2.5 rounded-lg">
                    <Info className="w-3.5 h-3.5 inline shrink-0" /> <strong>Tự động ẩn:</strong>{" "}
                    Nếu bạn không đánh dấu test case nào là Hidden, hệ thống sẽ tự động ẩn 1/3 cuối
                    khi lưu để đảm bảo tính chính xác chấm bài. Tối thiểu{" "}
                    <strong>3 test cases</strong>.
                  </p>

                  {/* Validation error */}
                  {labError && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 inline shrink-0" /> {labError}
                    </div>
                  )}
                </div>
              </div>
            )}

            {(itemType === ItemType.PRACTICE_QUIZ || itemType === ItemType.GRADED_QUIZ) && (
              <div className="space-y-4">
                <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs space-y-2">
                  <label
                    htmlFor="quizBankId"
                    className="block text-xs font-bold uppercase tracking-wider text-foreground"
                  >
                    Ngân hàng Câu hỏi liên kết
                  </label>
                  <Select
                    value={quizBankId}
                    onValueChange={(val) => {
                      setQuizBankId((val as string) || "");
                    }}
                  >
                    <Select.Trigger
                      id="quizBankId"
                      aria-label="Ngân hàng Câu hỏi liên kết"
                      className="w-full bg-card"
                    >
                      <Select.Value placeholder="-- Chọn Ngân hàng Câu hỏi --">
                        {(() => {
                          const bank = questionBanks.find((b) => b.id === quizBankId);
                          return bank
                            ? `${bank.title} (${bank.questions?.length || 0} câu hỏi trong ngân hàng)`
                            : "-- Chọn Ngân hàng Câu hỏi --";
                        })()}
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="">-- Chọn Ngân hàng Câu hỏi --</Select.Item>
                      {questionBanks.map((bank) => (
                        <Select.Item key={bank.id} value={bank.id}>
                          {`${bank.title} (${bank.questions?.length || 0} câu hỏi)`}
                        </Select.Item>
                      ))}
                    </Select.Content>
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
                        <Input
                          label="Thời gian (phút)"
                          type="number"
                          inputMode="numeric"
                          enterKeyHint="next"
                          value={quizTimeLimit}
                          onChange={(e) => setQuizTimeLimit(e.target.value)}
                          className="w-full text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <Input
                          label="Điểm đạt (%)"
                          type="number"
                          inputMode="numeric"
                          enterKeyHint="next"
                          value={quizPassingThreshold}
                          onChange={(e) => setQuizPassingThreshold(e.target.value)}
                          className="w-full text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <Input
                          label="Số lần làm tối đa"
                          type="number"
                          inputMode="numeric"
                          enterKeyHint="next"
                          value={quizMaxAttempts}
                          onChange={(e) => setQuizMaxAttempts(e.target.value)}
                          className="w-full text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <Input
                          label="Thời gian chờ (Giờ)"
                          type="number"
                          inputMode="numeric"
                          enterKeyHint="next"
                          value={quizCooldownHours}
                          onChange={(e) => setQuizCooldownHours(e.target.value)}
                          className="w-full text-xs font-semibold"
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
                        <Input
                          label="Số câu Dễ"
                          type="number"
                          inputMode="numeric"
                          enterKeyHint="next"
                          value={quizEasyCount}
                          onChange={(e) => setQuizEasyCount(e.target.value)}
                          className="w-full text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <Input
                          label="Số câu Trung bình"
                          type="number"
                          inputMode="numeric"
                          enterKeyHint="next"
                          value={quizMediumCount}
                          onChange={(e) => setQuizMediumCount(e.target.value)}
                          className="w-full text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <Input
                          label="Số câu Khó"
                          type="number"
                          inputMode="numeric"
                          enterKeyHint="done"
                          value={quizHardCount}
                          onChange={(e) => setQuizHardCount(e.target.value)}
                          className="w-full text-xs font-semibold"
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
                  <label
                    htmlFor="peerRubricJson"
                    className="block text-xs font-bold uppercase tracking-wider text-foreground"
                  >
                    Tiêu chí chấm điểm Peer Review (Cấu hình JSON)
                  </label>
                </div>
                <Textarea
                  id="peerRubricJson"
                  rows={8}
                  value={peerRubricJson}
                  onChange={(e) => setPeerRubricJson(e.target.value)}
                  className="w-full font-mono text-sm shadow-2xs"
                />
              </div>
            )}
          </div>

          {/* Fixed Footer Buttons */}
          <Dialog.Footer className="pt-3 border-t border-border mt-3 shrink-0">
            <Button
              type="button"
              variant="text"
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs font-bold"
            >
              {"Hủy"}
            </Button>
            <Button
              type="submit"
              variant="filled"
              size="sm"
              disabled={saving}
              className="rounded-xl text-xs font-bold shadow-md"
            >
              {isEdit ? "Cập nhật Học liệu" : "Xác nhận tạo Học liệu"}
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog>
  );
}
