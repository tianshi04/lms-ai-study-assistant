"use client";

import { useEffect, useState } from "react";
import { renderMarkdown } from "@/components/ai/AIChatMarkdownRenderer";
import { EssayGradingMode, ItemType } from "@/gen/catalog/v1/catalog_pb";
import { type QuestionBank } from "@/gen/assessment/v1/assessment_pb";
import { Dialog } from "@/components/ui/Dialog";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { RadioGroup, RadioItem } from "@/components/ui/RadioGroup";
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
  Eye,
  Edit3,
  AlertTriangle,
  FileCode,
  BookOpen,
  Terminal,
  Award,
  Pencil,
  Plus,
  Trash2,
  Sparkles,
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

export interface RubricCriterionItem {
  criteriaId: string;
  title: string;
  maxScore: number;
  description: string;
}

const RUBRIC_PRESETS: { name: string; items: RubricCriterionItem[] }[] = [
  {
    name: "Báo cáo nghiên cứu / Tự luận",
    items: [
      {
        criteriaId: "c1",
        title: "Chất lượng nội dung & Lập luận",
        maxScore: 10,
        description: "Mức độ hoàn thiện, tính logic và chiều sâu phân tích của giải pháp.",
      },
      {
        criteriaId: "c2",
        title: "Bố cục & Kỹ năng trình bày",
        maxScore: 10,
        description: "Tổ chức đề mục khoa học, diễn đạt mạch lạc, kèm dẫn chứng rõ ràng.",
      },
      {
        criteriaId: "c3",
        title: "Tính ứng dụng & Đóng góp",
        maxScore: 10,
        description: "Khả năng áp dụng vào thực tế hoặc mức độ đóng góp mới của đề tài.",
      },
    ],
  },
  {
    name: "Thiết kế Sản phẩm / UI-UX",
    items: [
      {
        criteriaId: "c1",
        title: "Trải nghiệm người dùng (UX)",
        maxScore: 10,
        description: "Luồng tương tác mượt mà, giải quyết tốt bài toán người dùng mục tiêu.",
      },
      {
        criteriaId: "c2",
        title: "Thiết kế giao diện (UI)",
        maxScore: 10,
        description: "Phân cấp thị giác rõ ràng, bảng màu và typography nhất quán, thẩm mỹ cao.",
      },
      {
        criteriaId: "c3",
        title: "Tính sáng tạo & Đột phá",
        maxScore: 10,
        description: "Ý tưởng mới lạ, giải quyết đúng nhu cầu thực tế của người dùng.",
      },
    ],
  },
  {
    name: "Đồ án Kỹ thuật / Lập trình",
    items: [
      {
        criteriaId: "c1",
        title: "Kiến trúc hệ thống & Clean Code",
        maxScore: 10,
        description: "Phân chia module rõ ràng, tuân thủ nguyên tắc thiết kế và dễ bảo trì.",
      },
      {
        criteriaId: "c2",
        title: "Hoàn thiện tính năng & Độ ổn định",
        maxScore: 10,
        description: "Các chức năng hoạt động đúng yêu cầu, xử lý ngoại lệ tốt.",
      },
      {
        criteriaId: "c3",
        title: "Tài liệu hướng dẫn (README)",
        maxScore: 10,
        description: "Hướng dẫn cài đặt, cấu hình và chạy thử rõ ràng, dễ làm theo.",
      },
    ],
  },
];

function safeParseRubricJson(jsonStr: string | undefined): RubricCriterionItem[] | null {
  if (!jsonStr || !jsonStr.trim()) return null;
  try {
    let parsed = JSON.parse(jsonStr);
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item, idx) => ({
        criteriaId: String(item.criteria_id || item.criteriaId || item.id || `c${idx + 1}`),
        title: String(item.title || ""),
        maxScore:
          typeof item.max_score === "number" && !Number.isNaN(item.max_score)
            ? item.max_score
            : typeof item.maxScore === "number" && !Number.isNaN(item.maxScore)
              ? item.maxScore
              : Number(item.max_score || item.maxScore) || 0,
        description: String(item.description || ""),
      }));
    }
  } catch {
    return null;
  }
  return null;
}

function parseRubricJsonWithFallback(jsonStr: string | undefined): RubricCriterionItem[] {
  const result = safeParseRubricJson(jsonStr);
  return result && result.length > 0 ? result : RUBRIC_PRESETS[0].items;
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

  // Reading / Instructions fields
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

  // Peer review / Essay fields
  const [essayGradingMode, setEssayGradingMode] = useState<EssayGradingMode>(() =>
    initialData?.essayGradingMode === EssayGradingMode.INSTRUCTOR_ONLY
      ? EssayGradingMode.INSTRUCTOR_ONLY
      : EssayGradingMode.PEER_REVIEW,
  );
  const [requiredPeerReviews, setRequiredPeerReviews] = useState<number>(
    () => initialData?.requiredPeerReviews || 3,
  );
  const [coldStartHours, setColdStartHours] = useState<number>(
    () => initialData?.coldStartHours || 48,
  );
  const [essayResubmissions, setEssayResubmissions] = useState<string | number>(() => {
    if (initialData?.essayMaxAttempts != null) {
      return Math.max(0, Number(initialData.essayMaxAttempts) - 1);
    }
    return "2";
  });
  const [rubricItems, setRubricItems] = useState<RubricCriterionItem[]>(() =>
    parseRubricJsonWithFallback(initialData?.rubricCriteriaJson),
  );
  const [rubricJsonError, setRubricJsonError] = useState("");
  const [peerError, setPeerError] = useState("");
  const [peerRubricJson, setPeerRubricJson] = useState(
    () =>
      initialData?.rubricCriteriaJson ||
      JSON.stringify(
        parseRubricJsonWithFallback(initialData?.rubricCriteriaJson).map((u) => ({
          criteria_id: u.criteriaId,
          title: u.title,
          max_score: u.maxScore,
          description: u.description,
        })),
        null,
        2,
      ),
  );

  const updateRubricItems = (items: RubricCriterionItem[]) => {
    setRubricItems(items);
    const jsonOutput = JSON.stringify(
      items.map((it) => ({
        criteria_id: it.criteriaId,
        title: it.title,
        max_score: Number.isFinite(Number(it.maxScore)) ? Number(it.maxScore) : 0,
        description: it.description,
      })),
      null,
      2,
    );
    setPeerRubricJson(jsonOutput);
    setRubricJsonError("");
    setPeerError("");
  };

  const handleUpdateRubricCriterion = (
    idx: number,
    field: keyof RubricCriterionItem,
    value: string | number,
  ) => {
    const updated = rubricItems.map((item, i) => (i === idx ? { ...item, [field]: value } : item));
    updateRubricItems(updated);
  };

  const handleAddRubricCriterion = () => {
    const maxNum = rubricItems.reduce((max, it) => {
      const match = it.criteriaId.match(/^c(\d+)$/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    const nextId = `c${Math.max(maxNum, rubricItems.length) + 1}`;
    const newItem: RubricCriterionItem = {
      criteriaId: nextId,
      title: "",
      maxScore: 10,
      description: "",
    };
    updateRubricItems([...rubricItems, newItem]);
  };

  const handleRemoveRubricCriterion = (idx: number) => {
    if (rubricItems.length <= 1) return;
    updateRubricItems(rubricItems.filter((_, i) => i !== idx));
  };

  const handleApplyPreset = (presetIndex: number) => {
    const preset = RUBRIC_PRESETS[presetIndex];
    if (!preset) return;
    updateRubricItems(preset.items);
  };

  const totalRubricScore = rubricItems.reduce((acc, curr) => acc + (Number(curr.maxScore) || 0), 0);

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
      setEssayGradingMode(
        initialData.essayGradingMode === EssayGradingMode.INSTRUCTOR_ONLY
          ? EssayGradingMode.INSTRUCTOR_ONLY
          : EssayGradingMode.PEER_REVIEW,
      );
      setRequiredPeerReviews(initialData.requiredPeerReviews || 3);
      setColdStartHours(initialData.coldStartHours || 48);
      setEssayResubmissions(
        initialData.essayMaxAttempts != null
          ? Math.max(0, Number(initialData.essayMaxAttempts) - 1)
          : 2,
      );
      const parsedRubrics = parseRubricJsonWithFallback(initialData.rubricCriteriaJson);
      setRubricItems(parsedRubrics);
      setPeerRubricJson(
        initialData.rubricCriteriaJson ||
          JSON.stringify(
            parsedRubrics.map((u) => ({
              criteria_id: u.criteriaId,
              title: u.title,
              max_score: u.maxScore,
              description: u.description,
            })),
            null,
            2,
          ),
      );
    }
  }, [initialData, isOpen]);

  const [labError, setLabError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLabError("");
    setPeerError("");

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

    // ── Bài tập tự luận validation ──
    if (itemType === ItemType.PEER_REVIEW) {
      const resubStr = String(essayResubmissions).trim();
      if (resubStr === "") {
        setPeerError("Số lượt nộp lại không được để trống (nhập 0 nếu không cho nộp lại).");
        return;
      }
      const resubNum = Number(resubStr);
      if (!Number.isInteger(resubNum) || resubNum < 0) {
        setPeerError(
          "Số lượt nộp lại phải là số nguyên từ 0 trở lên (nhập 0 nếu không cho nộp lại).",
        );
        return;
      }
      if (resubNum > 50) {
        setPeerError("Số lượt nộp lại không được vượt quá 50 lần.");
        return;
      }

      const parsed = safeParseRubricJson(peerRubricJson);
      if (!parsed || parsed.length === 0) {
        setPeerError("Bài tập tự luận bắt buộc phải có ít nhất 1 tiêu chí Rubric hợp lệ.");
        return;
      }
      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        if (!item.title.trim()) {
          setPeerError(`Tiêu chí #${i + 1} chưa có tiêu đề đánh giá.`);
          return;
        }
        if (
          typeof item.maxScore !== "number" ||
          item.maxScore <= 0 ||
          !Number.isFinite(item.maxScore)
        ) {
          setPeerError(
            `Điểm tối đa của tiêu chí '${item.title || `#${i + 1}`}' phải là số lớn hơn 0.`,
          );
          return;
        }
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
      rubricCriteriaJson: itemType === ItemType.PEER_REVIEW ? peerRubricJson : "",
      essayGradingMode:
        itemType === ItemType.PEER_REVIEW ? essayGradingMode : EssayGradingMode.UNSPECIFIED,
      requiredPeerReviews: itemType === ItemType.PEER_REVIEW ? requiredPeerReviews : 3,
      coldStartHours: itemType === ItemType.PEER_REVIEW ? coldStartHours : 48,
      essayMaxAttempts:
        itemType === ItemType.PEER_REVIEW
          ? Math.max(1, Math.floor(Number(essayResubmissions)) + 1)
          : 3,
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <Dialog.Content className="max-w-2xl max-h-[90vh] flex flex-col p-6 rounded-2xl bg-card border border-border">
        <Dialog.Header className="pb-3 border-b border-border">
          <Dialog.Title className="text-lg font-bold flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            {isEdit ? "Chỉnh sửa Học liệu" : "Tạo Học liệu mới"}
          </Dialog.Title>
          <Dialog.Description className="text-xs text-muted-foreground">
            Thiết lập chi tiết bài học, thời lượng dự kiến và các thông số kỹ thuật.
          </Dialog.Description>
        </Dialog.Header>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 py-3 overflow-y-auto pr-1 flex-1">
            {/* Common fields */}
            <div>
              <label
                htmlFor="itemTitle"
                className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider"
              >
                Tiêu đề học liệu *
              </label>
              <Input
                id="itemTitle"
                required
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
                placeholder="VD: Giới thiệu Tổng quan về Hệ thống"
                className="w-full text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider">
                  Loại học liệu *
                </label>
                <Select
                  value={String(itemType)}
                  onValueChange={(val) => setItemType(Number(val) as ItemType)}
                >
                  <Select.Trigger className="w-full text-xs font-semibold">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value={String(ItemType.VIDEO)}>
                      <div className="flex items-center gap-2">
                        <VideoIcon className="w-3.5 h-3.5 text-primary" />
                        <span>Bài giảng Video</span>
                      </div>
                    </Select.Item>
                    <Select.Item value={String(ItemType.READING)}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        <span>Tài liệu Đọc (Reading)</span>
                      </div>
                    </Select.Item>
                    <Select.Item value={String(ItemType.PRACTICE_QUIZ)}>
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-3.5 h-3.5 text-warning" />
                        <span>Trắc nghiệm Luyện tập</span>
                      </div>
                    </Select.Item>
                    <Select.Item value={String(ItemType.GRADED_QUIZ)}>
                      <div className="flex items-center gap-2">
                        <Award className="w-3.5 h-3.5 text-destructive" />
                        <span>Trắc nghiệm Tính điểm</span>
                      </div>
                    </Select.Item>
                    <Select.Item value={String(ItemType.AUTO_GRADED_LAB)}>
                      <div className="flex items-center gap-2">
                        <Code className="w-3.5 h-3.5 text-success" />
                        <span>Thực hành Lập trình (Lab)</span>
                      </div>
                    </Select.Item>
                    <Select.Item value={String(ItemType.PEER_REVIEW)}>
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-accent" />
                        <span>Bài tập tự luận</span>
                      </div>
                    </Select.Item>
                  </Select.Content>
                </Select>
              </div>

              <div>
                <label
                  htmlFor="itemMinutes"
                  className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider"
                >
                  Thời lượng ước tính (Phút)
                </label>
                <Input
                  id="itemMinutes"
                  type="number"
                  min={1}
                  value={itemMinutes}
                  onChange={(e) => setItemMinutes(Number(e.target.value) || 0)}
                  className="w-full text-xs font-semibold"
                />
              </div>
            </div>

            {/* Video specific fields */}
            {itemType === ItemType.VIDEO && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start pt-2 border-t border-border">
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

                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                      id="autoTranscribe"
                      checked={autoTranscribe}
                      onCheckedChange={(checked) => setAutoTranscribe(Boolean(checked))}
                    />
                    <label
                      htmlFor="autoTranscribe"
                      className="text-xs font-medium text-foreground cursor-pointer"
                    >
                      Tự động tạo phụ đề và bóc băng lời thoại bằng AI (Auto-transcribe)
                    </label>
                  </div>
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

            {/* Reading specific fields */}
            {itemType === ItemType.READING && (
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="readingMarkdown"
                    className="block text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-primary" /> Soạn thảo bài đọc (Markdown)
                  </label>
                  <span className="text-[11px] text-muted-foreground">Hỗ trợ Markdown đầy đủ</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[300px]">
                  <div className="flex flex-col gap-1.5">
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
                      <Edit3 className="w-3 h-3" /> Soạn thảo
                    </div>
                    <Textarea
                      id="readingMarkdown"
                      rows={12}
                      value={readingMarkdown}
                      onChange={(e) => setReadingMarkdown(e.target.value)}
                      placeholder="# Tiêu đề chính&#10;&#10;Nội dung bài viết... Bạn có thể dùng **in đậm**, *in nghiêng*, [liên kết](url)..."
                      className="w-full flex-1 font-mono text-xs shadow-2xs resize-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Xem trước
                    </div>
                    <div className="flex-1 p-3.5 rounded-xl border border-border bg-card text-xs overflow-y-auto max-h-[280px] prose prose-sm dark:prose-invert">
                      {readingMarkdown ? (
                        renderMarkdown(readingMarkdown)
                      ) : (
                        <span className="text-muted-foreground italic text-xs">
                          Xem trước bài viết sẽ hiển thị tại đây khi bạn nhập nội dung…
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Lab specific fields */}
            {itemType === ItemType.AUTO_GRADED_LAB && (
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-primary" /> Ngôn ngữ lập trình
                    </label>
                    <Select
                      value={labLanguage}
                      onValueChange={(val) => {
                        setLabLanguage((val as string) || "python");
                      }}
                    >
                      <Select.Trigger className="w-full text-xs font-semibold">
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="python">Python 3.12</Select.Item>
                        <Select.Item value="javascript">JavaScript (Node.js)</Select.Item>
                        <Select.Item value="typescript">TypeScript</Select.Item>
                        <Select.Item value="cpp">C++ (GCC)</Select.Item>
                      </Select.Content>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="labStarterCode"
                      className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <FileCode className="w-3.5 h-3.5 text-primary" /> Mã nguồn khởi đầu (Starter
                      Code)
                    </label>
                    <Textarea
                      id="labStarterCode"
                      rows={5}
                      value={labStarterCode}
                      onChange={(e) => setLabStarterCode(e.target.value)}
                      placeholder="# Khung hàm hoặc cấu trúc ban đầu cấp cho học viên..."
                      className="w-full font-mono text-xs shadow-2xs"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="labTestCasesJson"
                        className="block text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5"
                      >
                        <Terminal className="w-3.5 h-3.5 text-primary" /> Bộ Test Cases (JSON)
                      </label>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        Tối thiểu 3 test cases
                      </span>
                    </div>

                    {labError && (
                      <div className="mb-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{labError}</span>
                      </div>
                    )}

                    <Textarea
                      id="labTestCasesJson"
                      rows={8}
                      value={labTestCasesJson}
                      onChange={(e) => {
                        setLabTestCasesJson(e.target.value);
                        setLabError("");
                      }}
                      className="w-full font-mono text-xs shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Quiz Matrix Configuration */}
            {(itemType === ItemType.PRACTICE_QUIZ || itemType === ItemType.GRADED_QUIZ) && (
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-border/60">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-1">
                    <HelpCircle className="w-4 h-4 text-primary" /> Ma trận đề thi ngẫu nhiên
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Hệ thống sẽ bốc ngẫu nhiên câu hỏi theo từng độ khó từ Ngân hàng câu hỏi được
                    chỉ định mỗi khi học viên bắt đầu lượt làm bài mới.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider">
                    Ngân hàng câu hỏi nguồn *
                  </label>
                  <Select
                    value={quizBankId}
                    onValueChange={(val) => {
                      setQuizBankId((val as string) || "");
                    }}
                  >
                    <Select.Trigger className="w-full text-xs font-semibold">
                      <Select.Value placeholder="-- Chọn ngân hàng câu hỏi --">
                        {(() => {
                          const bank = questionBanks.find((b) => b.id === quizBankId);
                          return bank
                            ? `${bank.title} (${bank.questions?.length || 0} câu hỏi)`
                            : "-- Chọn ngân hàng câu hỏi --";
                        })()}
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="">-- Chọn ngân hàng câu hỏi --</Select.Item>
                      {questionBanks.map((bank) => (
                        <Select.Item key={bank.id} value={bank.id}>
                          {bank.title} ({bank.questions?.length || 0} câu hỏi)
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="quizTimeLimit"
                      className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider"
                    >
                      Thời gian làm bài (Phút)
                    </label>
                    <Input
                      id="quizTimeLimit"
                      type="number"
                      min={1}
                      max={180}
                      value={quizTimeLimit}
                      onChange={(e) => setQuizTimeLimit(e.target.value)}
                      className="w-full text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="quizPassingThreshold"
                      className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider"
                    >
                      Ngưỡng điểm đạt (%)
                    </label>
                    <Input
                      id="quizPassingThreshold"
                      type="number"
                      min={1}
                      max={100}
                      value={quizPassingThreshold}
                      onChange={(e) => setQuizPassingThreshold(e.target.value)}
                      className="w-full text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label
                      htmlFor="quizEasyCount"
                      className="block text-xs font-bold text-success mb-1 uppercase tracking-wider"
                    >
                      Số câu Dễ
                    </label>
                    <Input
                      id="quizEasyCount"
                      type="number"
                      min={0}
                      value={quizEasyCount}
                      onChange={(e) => setQuizEasyCount(e.target.value)}
                      className="w-full text-xs font-semibold border-success/30"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="quizMediumCount"
                      className="block text-xs font-bold text-warning mb-1 uppercase tracking-wider"
                    >
                      Số câu Vừa
                    </label>
                    <Input
                      id="quizMediumCount"
                      type="number"
                      min={0}
                      value={quizMediumCount}
                      onChange={(e) => setQuizMediumCount(e.target.value)}
                      className="w-full text-xs font-semibold border-warning/30"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="quizHardCount"
                      className="block text-xs font-bold text-destructive mb-1 uppercase tracking-wider"
                    >
                      Số câu Khó
                    </label>
                    <Input
                      id="quizHardCount"
                      type="number"
                      min={0}
                      value={quizHardCount}
                      onChange={(e) => setQuizHardCount(e.target.value)}
                      className="w-full text-xs font-semibold border-destructive/30"
                    />
                  </div>
                </div>

                {itemType === ItemType.GRADED_QUIZ && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                    <div>
                      <label
                        htmlFor="quizMaxAttempts"
                        className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider"
                      >
                        Số lần thử tối đa
                      </label>
                      <Input
                        id="quizMaxAttempts"
                        type="number"
                        min={1}
                        value={quizMaxAttempts}
                        onChange={(e) => setQuizMaxAttempts(e.target.value)}
                        className="w-full text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="quizCooldownHours"
                        className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider"
                      >
                        Thời gian chờ làm lại (Giờ)
                      </label>
                      <Input
                        id="quizCooldownHours"
                        type="number"
                        min={0}
                        value={quizCooldownHours}
                        onChange={(e) => setQuizCooldownHours(e.target.value)}
                        className="w-full text-xs font-semibold"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Essay / Peer review specific fields */}
            {itemType === ItemType.PEER_REVIEW && (
              <div className="space-y-4 pt-2 border-t border-border">
                {peerError && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{peerError}</span>
                  </div>
                )}

                {/* ─── 0. Chế độ chấm điểm Bài tập tự luận ─── */}
                <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-primary" aria-hidden="true" /> Hình thức Chấm
                      điểm Bài tập tự luận
                    </span>
                  </div>

                  <RadioGroup
                    value={String(essayGradingMode)}
                    onValueChange={(val) => setEssayGradingMode(Number(val) as EssayGradingMode)}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3"
                  >
                    <div
                      className={`p-3 rounded-xl border transition-colors ${
                        essayGradingMode === EssayGradingMode.PEER_REVIEW
                          ? "border-primary bg-primary/5"
                          : "border-border bg-surface-container-low/40"
                      }`}
                    >
                      <RadioItem
                        value={String(EssayGradingMode.PEER_REVIEW)}
                        label="Chấm chéo bạn học"
                        description="Học viên chấm chéo ẩn danh cho nhau theo Rubric; tự động chuyển Giảng viên chấm nếu quá thời gian chờ."
                      />
                    </div>
                    <div
                      className={`p-3 rounded-xl border transition-colors ${
                        essayGradingMode === EssayGradingMode.INSTRUCTOR_ONLY
                          ? "border-primary bg-primary/5"
                          : "border-border bg-surface-container-low/40"
                      }`}
                    >
                      <RadioItem
                        value={String(EssayGradingMode.INSTRUCTOR_ONLY)}
                        label="Chỉ Giảng viên / Trợ giảng chấm trực tiếp"
                        description="Không áp dụng chấm chéo; bài nộp chuyển thẳng vào hàng chờ Giảng viên chấm ngay."
                      />
                    </div>
                  </RadioGroup>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-border/60 items-start">
                    <div className="flex flex-col justify-start">
                      <label
                        htmlFor="essayResubmissions"
                        className="text-[11px] font-bold text-foreground mb-1 min-h-[2.25rem] flex items-end"
                      >
                        Số lượt nộp lại
                      </label>
                      <Input
                        id="essayResubmissions"
                        type="number"
                        min={0}
                        max={50}
                        required
                        value={essayResubmissions}
                        onChange={(e) => {
                          setEssayResubmissions(e.target.value);
                          if (peerError) setPeerError("");
                        }}
                        placeholder="2"
                        className="w-full text-xs font-semibold h-10"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1.5 min-h-[2.5rem] leading-relaxed">
                        {String(essayResubmissions).trim() === "0"
                          ? "0 lượt: Không cho nộp lại (học viên chỉ nộp 1 lần duy nhất)."
                          : String(essayResubmissions).trim() === ""
                            ? "Không được để trống (nhập 0 nếu không cho nộp lại)."
                            : `Cho phép nộp lại ${essayResubmissions} lần (tổng tối đa ${Number(essayResubmissions) + 1} lần nộp bài).`}
                      </p>
                    </div>

                    {essayGradingMode === EssayGradingMode.PEER_REVIEW && (
                      <>
                        <div className="flex flex-col justify-start">
                          <label className="text-[11px] font-bold text-foreground mb-1 min-h-[2.25rem] flex items-end">
                            Số bài bạn học cần chấm
                          </label>
                          <Select
                            value={String(requiredPeerReviews)}
                            onValueChange={(val) => setRequiredPeerReviews(Number(val) || 3)}
                          >
                            <Select.Trigger className="w-full text-xs font-semibold h-10">
                              <Select.Value />
                            </Select.Trigger>
                            <Select.Content>
                              {[1, 2, 3, 4, 5].map((cnt) => (
                                <Select.Item key={cnt} value={String(cnt)}>
                                  {cnt} bài bạn học {cnt === 3 ? "(Mặc định)" : ""}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select>
                          <p className="text-[10px] text-muted-foreground mt-1.5 min-h-[2.5rem] leading-relaxed">
                            Học viên phải chấm đủ số bài này để hoàn thành học phần.
                          </p>
                        </div>
                        <div className="flex flex-col justify-start">
                          <label className="text-[11px] font-bold text-foreground mb-1 min-h-[2.25rem] flex items-end">
                            Thời gian chờ chuyển Giảng viên chấm
                          </label>
                          <Select
                            value={String(coldStartHours)}
                            onValueChange={(val) => setColdStartHours(Number(val) || 48)}
                          >
                            <Select.Trigger className="w-full text-xs font-semibold h-10">
                              <Select.Value />
                            </Select.Trigger>
                            <Select.Content>
                              <Select.Item value="24">24 giờ (1 ngày)</Select.Item>
                              <Select.Item value="48">48 giờ (2 ngày - Mặc định)</Select.Item>
                              <Select.Item value="72">72 giờ (3 ngày)</Select.Item>
                            </Select.Content>
                          </Select>
                          <p className="text-[10px] text-muted-foreground mt-1.5 min-h-[2.5rem] leading-relaxed">
                            Sau số giờ này nếu lớp ít bài, tự động giảm chỉ tiêu chấm.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* ─── 1. Đề bài bài tập & Hướng dẫn nộp bài (Markdown Preview) ─── */}
                <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2.5">
                    <label
                      htmlFor="peerReadingMarkdown"
                      className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5"
                    >
                      <BookOpen className="w-4 h-4 text-primary" /> Yêu cầu Đề bài & Hướng dẫn nộp
                      bài
                    </label>
                    <span className="text-[11px] text-muted-foreground">Markdown Preview</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[220px]">
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="peerReadingMarkdown"
                        className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" /> Soạn thảo đề bài (Markdown)
                      </label>
                      <Textarea
                        id="peerReadingMarkdown"
                        rows={9}
                        value={readingMarkdown}
                        onChange={(e) => setReadingMarkdown(e.target.value)}
                        placeholder="## Yêu cầu Dự án / Bài tập&#10;Mô tả bối cảnh và mục tiêu cần giải quyết...&#10;&#10;## Hình thức nộp bài&#10;- Link sản phẩm: Figma, Canva, Github, Google Drive hoặc Slide...&#10;- Bản tóm tắt giải pháp / Bài luận văn bản."
                        className="w-full flex-1 font-mono text-xs shadow-2xs resize-y"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Xem trước nội dung
                      </div>
                      <div className="flex-1 p-3.5 rounded-xl border border-border bg-card text-xs overflow-y-auto max-h-[240px] prose prose-sm dark:prose-invert">
                        {readingMarkdown ? (
                          renderMarkdown(readingMarkdown)
                        ) : (
                          <span className="text-muted-foreground italic text-xs">
                            Xem trước đề bài sẽ hiển thị tại đây khi bạn nhập Markdown…
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─── 2. Tiêu chí chấm điểm Peer Review (Visual Rubric Builder) ─── */}
                <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Users className="w-4 h-4 text-primary" aria-hidden="true" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Thang Tiêu chí Đánh giá (Rubric)
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                        Tổng điểm: {totalRubricScore}đ
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="tonal"
                        size="xs"
                        onClick={handleAddRubricCriterion}
                        className="gap-1.5 text-xs font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Thêm tiêu chí</span>
                      </Button>
                    </div>
                  </div>

                  {/* Preset Templates */}
                  <div className="flex items-center gap-2 flex-wrap p-2.5 rounded-xl bg-surface-container-low border border-border/60">
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                      Gợi ý mẫu nhanh:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {RUBRIC_PRESETS.map((preset, pIdx) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => handleApplyPreset(pIdx)}
                          className="px-2 py-1 rounded-lg text-[11px] font-medium bg-background border border-border hover:border-primary hover:text-primary transition-colors cursor-pointer"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {rubricJsonError && (
                    <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                      {rubricJsonError}
                    </div>
                  )}

                  {/* Visual Rubric Builder */}
                  <div className="space-y-3">
                    {rubricItems.map((criterion, idx) => (
                      <div
                        key={criterion.criteriaId || idx}
                        className="p-3.5 rounded-xl bg-surface-container-lowest border border-border space-y-2.5 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <Input
                                value={criterion.title}
                                onChange={(e) =>
                                  handleUpdateRubricCriterion(idx, "title", e.target.value)
                                }
                                placeholder="Tên tiêu chí (ví dụ: Chất lượng giải pháp, Tính thẩm mỹ...)"
                                className="w-full text-xs font-semibold"
                                aria-label={`Tên tiêu chí #${idx + 1}`}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-muted-foreground font-medium">
                                Tối đa:
                              </span>
                              <Input
                                type="number"
                                min={1}
                                max={100}
                                value={criterion.maxScore}
                                onChange={(e) =>
                                  handleUpdateRubricCriterion(
                                    idx,
                                    "maxScore",
                                    Number(e.target.value) || 0,
                                  )
                                }
                                className="w-20 text-xs font-bold text-center"
                                aria-label={`Điểm tối đa tiêu chí #${idx + 1}`}
                              />
                              <span className="text-xs text-muted-foreground font-semibold">
                                điểm
                              </span>
                            </div>

                            <Button
                              type="button"
                              variant="text"
                              size="xs"
                              disabled={rubricItems.length <= 1}
                              onClick={() => handleRemoveRubricCriterion(idx)}
                              className="text-destructive hover:bg-destructive/10 p-1.5 h-auto rounded-lg"
                              aria-label={`Xóa tiêu chí #${idx + 1}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <Textarea
                          value={criterion.description}
                          onChange={(e) =>
                            handleUpdateRubricCriterion(idx, "description", e.target.value)
                          }
                          rows={2}
                          placeholder="Mô tả chỉ dẫn cách chấm: Tiêu chuẩn để đạt điểm tối đa ở tiêu chí này..."
                          className="w-full text-xs"
                          aria-label={`Mô tả tiêu chí #${idx + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
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
