"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { Plus, HelpCircle, FolderOpen, Pencil, Trash2, Info } from "lucide-react";

import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

import {
  useQuestionBanksQuery,
  useCreateQuestionBankMutation,
  useAddQuestionToBankMutation,
  useUpdateQuestionMutation,
  useDeleteQuestionMutation,
} from "@/lib/query_hooks";
import { type Question } from "@/gen/assessment/v1/assessment_pb";

export default function QuestionBankPage({ params }: { params: Promise<{ courseId: string }> }) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.courseId;
  const toast = useToast();

  // Queries & Mutations
  const { data: banks = [], isLoading, refetch } = useQuestionBanksQuery(courseId);
  const createBankMutation = useCreateQuestionBankMutation();
  const addQuestionMutation = useAddQuestionToBankMutation();
  const updateQuestionMutation = useUpdateQuestionMutation();
  const deleteQuestionMutation = useDeleteQuestionMutation();

  // Selected state
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const selectedBank = banks.find((b) => b.id === selectedBankId) || null;

  // Modals visibility
  const [showCreateBankModal, setShowCreateBankModal] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);

  // New Bank Form States
  const [newBankTitle, setNewBankTitle] = useState("");
  const [newBankCategory, setNewBankCategory] = useState("PRACTICE");
  const [newBankDesc, setNewBankDesc] = useState("");
  const [creatingBank, setCreatingBank] = useState(false);

  // New/Edit Question Form States
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState("SINGLE_CHOICE");
  const [qDifficulty, setQDifficulty] = useState("EASY");
  const [qExplanation, setQExplanation] = useState("");
  const [qOptions, setQOptions] = useState<Array<{ optionText: string; isCorrect: boolean }>>([
    { optionText: "", isCorrect: false },
    { optionText: "", isCorrect: false },
  ]);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  // Handlers
  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankTitle.trim()) return;

    setCreatingBank(true);
    try {
      const newBank = await createBankMutation.mutateAsync({
        courseId,
        title: newBankTitle,
        category: newBankCategory,
        description: newBankDesc,
      });
      toast.success("Tạo Kho Ngân hàng Đề thành công!");
      setShowCreateBankModal(false);
      setNewBankTitle("");
      setNewBankDesc("");
      await refetch();
      // Auto-select the newly created bank
      if (newBank && newBank.id) {
        setSelectedBankId(newBank.id);
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Tạo Kho Ngân hàng Đề thất bại.");
    } finally {
      setCreatingBank(false);
    }
  };

  const handleAddOption = () => {
    setQOptions([...qOptions, { optionText: "", isCorrect: false }]);
  };

  const handleRemoveOption = (index: number) => {
    if (qOptions.length <= 2) return;
    setQOptions(qOptions.filter((_, idx) => idx !== index));
  };

  const handleOptionChange = (index: number, text: string) => {
    const updated = [...qOptions];
    updated[index].optionText = text;
    setQOptions(updated);
  };

  const handleOptionCorrectChange = (index: number, checked: boolean) => {
    const updated = qOptions.map((opt, idx) => {
      if (qType === "SINGLE_CHOICE" || qType === "TRUE_FALSE") {
        return { ...opt, isCorrect: idx === index ? checked : false };
      }
      return idx === index ? { ...opt, isCorrect: checked } : opt;
    });
    setQOptions(updated);
  };

  const handleOpenEditQuestionModal = (q: Question) => {
    setEditingQuestionId(q.id);
    setQText(q.text);
    setQExplanation(q.explanation || "");
    setQType(q.questionType);
    setQDifficulty(q.difficulty);
    setQOptions(
      q.options.map((opt) => ({
        optionText: opt.optionText,
        isCorrect: opt.isCorrect,
      })),
    );
    setShowAddQuestionModal(true);
  };

  const handleDeleteQuestion = async () => {
    if (!deletingQuestionId) return;
    try {
      const res = await deleteQuestionMutation.mutateAsync({ questionId: deletingQuestionId });
      if (res.success) {
        toast.success("Đã xóa câu hỏi thành công!");
        await refetch();
      } else {
        toast.error(res.message || "Xóa câu hỏi thất bại.");
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Xóa câu hỏi thất bại.");
    } finally {
      setDeletingQuestionId(null);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBankId && !editingQuestionId) return;

    // Validations
    if (!qText.trim()) {
      toast.error("Vui lòng nhập nội dung câu hỏi.");
      return;
    }
    if (qOptions.length < 2) {
      toast.error("Vui lòng thêm ít nhất 2 tùy chọn đáp án.");
      return;
    }
    if (qOptions.some((opt) => !opt.optionText.trim())) {
      toast.error("Nội dung tùy chọn không được để trống.");
      return;
    }
    if (qOptions.every((opt) => !opt.isCorrect)) {
      toast.error("Vui lòng chọn ít nhất một đáp án đúng.");
      return;
    }

    // Normalize options for single-choice question types
    let finalOptions = qOptions;
    if (qType === "SINGLE_CHOICE" || qType === "TRUE_FALSE") {
      let foundCorrect = false;
      finalOptions = qOptions.map((opt) => {
        if (opt.isCorrect && !foundCorrect) {
          foundCorrect = true;
          return opt;
        }
        return { ...opt, isCorrect: false };
      });
    }

    setSubmittingQuestion(true);
    try {
      if (editingQuestionId) {
        await updateQuestionMutation.mutateAsync({
          questionId: editingQuestionId,
          questionType: qType,
          difficulty: qDifficulty,
          text: qText,
          explanation: qExplanation,
          options: finalOptions,
        });
        toast.success("Đã cập nhật câu hỏi thành công!");
      } else {
        await addQuestionMutation.mutateAsync({
          bankId: selectedBankId!,
          questionType: qType,
          difficulty: qDifficulty,
          text: qText,
          explanation: qExplanation,
          options: finalOptions,
        });
        toast.success("Đã thêm câu hỏi vào Kho thành công!");
      }

      setShowAddQuestionModal(false);
      // Reset form
      setEditingQuestionId(null);
      setQText("");
      setQExplanation("");
      setQType("SINGLE_CHOICE");
      setQDifficulty("EASY");
      setQOptions([
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false },
      ]);
      await refetch();
    } catch (err: unknown) {
      console.error(err);
      toast.error(editingQuestionId ? "Cập nhật câu hỏi thất bại." : "Thêm câu hỏi thất bại.");
    } finally {
      setSubmittingQuestion(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/instructor/courses" className="hover:text-primary">
              {"Giảng viên"}
            </Link>
            <span>/</span>
            <Link href={`/instructor/courses/${courseId}`} className="hover:text-primary">
              {"Biên soạn bài học"}
            </Link>
            <span>/</span>
            <span className="font-semibold text-foreground">{"Ngân hàng Câu hỏi & Đề thi"}</span>
          </div>

          <Link
            href={`/instructor/courses/${courseId}`}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-muted text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
          >
            {"Danh sách Khóa học"}
          </Link>
        </div>

        {/* Page Header */}
        <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-extrabold uppercase mb-2">
              Question Pool Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground text-balance">
              {"Ngân hàng Câu hỏi & Đề thi"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {
                "Quản lý các kho đề thi và câu hỏi của khóa học. Thiết lập các bậc câu hỏi để rút ngẫu nhiên làm đề thi."
              }
            </p>
          </div>
          <button
            onClick={() => setShowCreateBankModal(true)}
            className="px-5 py-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm shadow-md shadow-primary/10 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{"Tạo Kho Ngân hàng Đề"}</span>
          </button>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span aria-live="polite">{"Đang tải cấu trúc bài giảng khóa học…"}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Panel - Question Banks Directory */}
            <div className="lg:col-span-4 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                Danh sách Kho đề ({banks.length})
              </h2>

              {banks.length === 0 ? (
                <div className="p-8 text-center bg-card rounded-3xl border border-dashed border-border text-muted-foreground">
                  <p className="text-sm font-semibold">
                    {"Khóa học này chưa có Kho ngân hàng đề nào."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {banks.map((bank) => {
                    const isSelected = bank.id === selectedBankId;
                    return (
                      <button
                        key={bank.id}
                        onClick={() => setSelectedBankId(bank.id)}
                        className={`w-full text-left p-5 rounded-2xl border transition-all flex flex-col gap-1 cursor-pointer ${
                          isSelected
                            ? "bg-primary/10 border-primary ring-1 ring-primary"
                            : "bg-card border-border hover:border-muted-foreground/30"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                            {bank.category === "MODULE_EXAM"
                              ? "Tuần"
                              : bank.category === "FINAL_EXAM"
                                ? "Cuối khóa"
                                : "Luyện tập"}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            ID: {bank.id}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-sm text-foreground mt-1">
                          {bank.title}
                        </h3>
                        {bank.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {bank.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 border-t border-border pt-2 w-full">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>{bank.questions?.length || 0} câu hỏi</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Panel - Bank Questions list */}
            <div className="lg:col-span-8">
              {!selectedBank ? (
                <div className="py-20 text-center bg-card rounded-3xl border border-border p-8 space-y-4">
                  <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground/40" />
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Chưa chọn Kho ngân hàng đề
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      Vui lòng chọn một Kho đề thi ở danh sách bên trái hoặc tạo Kho mới để bắt đầu
                      quản lý danh sách câu hỏi.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Selected Bank Banner */}
                  <div className="bg-card p-6 rounded-3xl border border-border shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-foreground">{selectedBank.title}</h2>
                        <span className="text-xs font-mono px-2 py-0.5 bg-muted rounded text-muted-foreground">
                          ID: {selectedBank.id}
                        </span>
                      </div>
                      {selectedBank.description && (
                        <p className="text-xs text-muted-foreground">{selectedBank.description}</p>
                      )}
                      <p className="text-xs font-bold text-primary pt-1">
                        {"Tổng số câu hỏi:"} {selectedBank.questions?.length || 0}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setEditingQuestionId(null);
                        setQText("");
                        setQExplanation("");
                        setQType("SINGLE_CHOICE");
                        setQDifficulty("EASY");
                        setQOptions([
                          { optionText: "", isCorrect: false },
                          { optionText: "", isCorrect: false },
                        ]);
                        setShowAddQuestionModal(true);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{"Thêm Câu hỏi vào Kho"}</span>
                    </button>
                  </div>

                  {/* Questions List */}
                  {!selectedBank.questions || selectedBank.questions.length === 0 ? (
                    <div className="py-16 text-center bg-card rounded-3xl border border-dashed border-border text-muted-foreground p-8 space-y-3">
                      <HelpCircle className="w-10 h-10 mx-auto text-muted-foreground/50" />
                      <p className="text-sm font-semibold">
                        {"Kho đề này chưa có câu hỏi nào. Hãy thêm câu hỏi đầu tiên!"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedBank.questions.map((q, idx) => {
                        return (
                          <div
                            key={q.id}
                            className="bg-card rounded-2xl border border-border p-5 shadow-xs space-y-3 hover:border-muted-foreground/30 transition-colors"
                          >
                            {/* Question Meta */}
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-extrabold text-muted-foreground">
                                CÂU HỎI {idx + 1}
                              </span>

                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                    q.difficulty === "EASY"
                                      ? "bg-success/10 text-success border border-success/20"
                                      : q.difficulty === "MEDIUM"
                                        ? "bg-warning/10 text-warning border border-warning/20"
                                        : "bg-destructive/10 text-destructive border border-destructive/20"
                                  }`}
                                >
                                  {q.difficulty === "EASY"
                                    ? "Dễ (Easy)"
                                    : q.difficulty === "MEDIUM"
                                      ? "Trung bình (Medium)"
                                      : "Khó (Hard)"}
                                </span>
                                <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded mr-2">
                                  {q.questionType}
                                </span>

                                <div className="flex items-center gap-1 border-l border-border pl-2">
                                  <button
                                    onClick={() => handleOpenEditQuestionModal(q)}
                                    className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted transition-colors cursor-pointer"
                                    title="Sửa"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingQuestionId(q.id)}
                                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                    title="Xoá"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Question Text */}
                            <p className="text-sm font-bold text-foreground whitespace-pre-wrap">
                              {q.text}
                            </p>

                            {/* Options List */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                              {q.options?.map((opt, oIdx) => (
                                <div
                                  key={opt.id || oIdx}
                                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs ${
                                    opt.isCorrect
                                      ? "bg-success/10 border-success/30 text-success font-bold"
                                      : "bg-muted/50 border-border text-muted-foreground"
                                  }`}
                                >
                                  {opt.isCorrect ? (
                                    <span className="w-5 h-5 rounded-full bg-success text-success-foreground flex items-center justify-center font-bold text-[10px] shadow-xs flex-shrink-0">
                                      ✓
                                    </span>
                                  ) : (
                                    <span className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center font-bold text-[10px] text-muted-foreground flex-shrink-0">
                                      {oIdx + 1}
                                    </span>
                                  )}
                                  <span className="flex-1">{opt.optionText}</span>
                                </div>
                              ))}
                            </div>

                            {/* Answer Explanation */}
                            {q.explanation && (
                              <div className="mt-3 p-3.5 rounded-xl bg-card border border-border text-xs text-muted-foreground flex items-start gap-2">
                                <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                <div>
                                  <span className="font-bold text-foreground block mb-0.5">
                                    Lời giải thích:
                                  </span>
                                  {q.explanation}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* --- Modal Create Bank --- */}
      <Modal
        isOpen={showCreateBankModal}
        onClose={() => setShowCreateBankModal(false)}
        title={"Tạo Kho Ngân hàng Đề mới"}
      >
        <form onSubmit={handleCreateBank} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              {"Tên Kho Ngân hàng Đề"} *
            </label>
            <input
              type="text"
              required
              value={newBankTitle}
              onChange={(e) => setNewBankTitle(e.target.value)}
              placeholder="Ví dụ: Kho thi kết thúc Tuần 1: Khái niệm AI"
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              {"Phân loại Kho"}
            </label>
            <select
              value={newBankCategory}
              onChange={(e) => setNewBankCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm font-bold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <option value="PRACTICE">{"Luyện tập (PRACTICE)"}</option>
              <option value="MODULE_EXAM">{"Bài thi Tuần (MODULE_EXAM)"}</option>
              <option value="FINAL_EXAM">{"Bài thi Cuối khóa (FINAL_EXAM)"}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              {"Mô tả"}
            </label>
            <textarea
              rows={3}
              value={newBankDesc}
              onChange={(e) => setNewBankDesc(e.target.value)}
              placeholder="Mô tả tóm tắt nội dung các câu hỏi trong kho này…"
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setShowCreateBankModal(false)}
              className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted cursor-pointer"
            >
              {"Hủy"}
            </button>
            <button
              type="submit"
              disabled={creatingBank}
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground font-bold text-xs cursor-pointer"
            >
              <span aria-live="polite">{creatingBank ? "Đang tạo…" : "Xác nhận tạo Kho"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* --- Modal Add Question --- */}
      <Modal
        isOpen={showAddQuestionModal}
        onClose={() => setShowAddQuestionModal(false)}
        title={editingQuestionId ? "Chỉnh sửa câu hỏi" : "Thêm Câu hỏi vào Kho"}
        size="lg"
      >
        <form onSubmit={handleAddQuestion} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              {"Nội dung câu hỏi (hỗ trợ Markdown)"} *
            </label>
            <textarea
              required
              rows={3}
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder="Nhập nội dung câu hỏi…"
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                {"Dạng câu hỏi"}
              </label>
              <select
                value={qType}
                onChange={(e) => {
                  const val = e.target.value;
                  setQType(val);

                  if (val === "TRUE_FALSE") {
                    setQOptions([
                      { optionText: "Đúng (True)", isCorrect: false },
                      { optionText: "Sai (False)", isCorrect: false },
                    ]);
                  } else if (qType === "TRUE_FALSE") {
                    setQOptions([
                      { optionText: "", isCorrect: false },
                      { optionText: "", isCorrect: false },
                    ]);
                  } else if (val === "SINGLE_CHOICE") {
                    let hasOneCorrect = false;
                    const normalized = qOptions.map((opt) => {
                      if (opt.isCorrect && !hasOneCorrect) {
                        hasOneCorrect = true;
                        return opt;
                      }
                      return { ...opt, isCorrect: false };
                    });
                    setQOptions(normalized);
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm font-bold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <option value="SINGLE_CHOICE">Trắc nghiệm 1 đáp án (Single Choice)</option>
                <option value="MULTIPLE_CHOICE">Trắc nghiệm nhiều đáp án (Multiple Choice)</option>
                <option value="TRUE_FALSE">Chọn Đúng/Sai (True/False)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Nội dung Cốt lõi của Câu hỏi *
            </label>
            <textarea
              rows={3}
              required
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder="Nhập nội dung đề bài câu hỏi…"
              className="w-full px-3 py-2 rounded-xl border border-input bg-card text-foreground text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Options */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Danh sách Phương án Trả lời *
              </label>
              <button
                type="button"
                onClick={handleAddOption}
                className="text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                + Thêm Phương án
              </button>
            </div>
            <div className="space-y-2">
              {qOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={opt.isCorrect}
                    onChange={(e) => handleOptionCorrectChange(idx, e.target.checked)}
                    className="w-4 h-4 text-primary rounded cursor-pointer"
                    title="Đánh dấu phương án đúng"
                  />
                  <input
                    type="text"
                    required
                    value={opt.optionText}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Phương án ${idx + 1}…`}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-input bg-card text-foreground text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  {qOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-1 text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Giải thích Đáp án (Explanation)
            </label>
            <textarea
              rows={2}
              value={qExplanation}
              onChange={(e) => setQExplanation(e.target.value)}
              placeholder="Giải thích lý do tại sao phương án đó đúng…"
              className="w-full px-3 py-2 rounded-xl border border-input bg-card text-foreground text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddQuestionModal(false)}
              className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted cursor-pointer"
            >
              {"Hủy"}
            </button>
            <button
              type="submit"
              disabled={submittingQuestion}
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground font-bold text-xs cursor-pointer"
            >
              <span aria-live="polite">
                {submittingQuestion
                  ? "Đang lưu…"
                  : editingQuestionId
                    ? "Lưu thay đổi"
                    : "Lưu câu hỏi"}
              </span>
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deletingQuestionId !== null}
        onClose={() => setDeletingQuestionId(null)}
        onConfirm={handleDeleteQuestion}
        title={"Xác nhận xóa câu hỏi"}
        description={
          "Bạn có chắc chắn muốn xóa câu hỏi này không? Thao tác này không thể hoàn tác."
        }
        confirmText="Xoá"
        cancelText="Hủy"
        variant="danger"
        isLoading={deleteQuestionMutation.isPending}
      />
    </div>
  );
}
