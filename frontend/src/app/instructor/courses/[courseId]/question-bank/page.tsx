"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useTranslation } from "@/lib/i18n/TranslationProvider";
import {
  useQuestionBanksQuery,
  useCreateQuestionBankMutation,
  useAddQuestionToBankMutation,
  useUpdateQuestionMutation,
  useDeleteQuestionMutation,
} from "@/lib/query_hooks";
import { type Question } from "@/gen/assessment/v1/assessment_pb";

export default function QuestionBankPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.courseId;
  const toast = useToast();
  const { t } = useTranslation();

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
      toast.success(t("instructorBuilder.toastBankCreated"));
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
      toast.error(t("instructorBuilder.toastBankCreateFail"));
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
    setQOptions(q.options.map((opt) => ({
      optionText: opt.optionText,
      isCorrect: opt.isCorrect,
    })));
    setShowAddQuestionModal(true);
  };

  const handleDeleteQuestion = async () => {
    if (!deletingQuestionId) return;
    try {
      const res = await deleteQuestionMutation.mutateAsync({ questionId: deletingQuestionId });
      if (res.success) {
        toast.success(t("instructorBuilder.toastQuestionDeleted"));
        await refetch();
      } else {
        toast.error(res.message || t("instructorBuilder.toastQuestionDeleteFail"));
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error(t("instructorBuilder.toastQuestionDeleteFail"));
    } finally {
      setDeletingQuestionId(null);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBankId && !editingQuestionId) return;

    // Validations
    if (!qText.trim()) {
      toast.error(t("instructorBuilder.validateQuestionText"));
      return;
    }
    if (qOptions.length < 2) {
      toast.error(t("instructorBuilder.validateOptionsCount"));
      return;
    }
    if (qOptions.some((opt) => !opt.optionText.trim())) {
      toast.error(t("instructorBuilder.validateOptionsText"));
      return;
    }
    if (qOptions.every((opt) => !opt.isCorrect)) {
      toast.error(t("instructorBuilder.validateCorrectOption"));
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
        toast.success(t("instructorBuilder.toastQuestionUpdated"));
      } else {
        await addQuestionMutation.mutateAsync({
          bankId: selectedBankId!,
          questionType: qType,
          difficulty: qDifficulty,
          text: qText,
          explanation: qExplanation,
          options: finalOptions,
        });
        toast.success(t("instructorBuilder.toastQuestionAdded"));
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
      toast.error(editingQuestionId ? t("instructorBuilder.toastQuestionUpdateFail") : t("instructorBuilder.toastQuestionAddFail"));
    } finally {
      setSubmittingQuestion(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Link href="/instructor/courses" className="hover:text-blue-600 dark:hover:text-blue-400">
              {t("instructorBuilder.breadcrumbInstructor")}
            </Link>
            <span>/</span>
            <Link href={`/instructor/courses/${courseId}`} className="hover:text-blue-600 dark:hover:text-blue-400">
              {t("instructorBuilder.breadcrumbBuilder")}
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {t("instructorBuilder.questionBankPageTitle")}
            </span>
          </div>

          <Link
            href={`/instructor/courses/${courseId}`}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {t("instructorBuilder.backBtn")}
          </Link>
        </div>

        {/* Page Header */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-extrabold uppercase mb-2">
              Question Pool Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {t("instructorBuilder.questionBankPageTitle")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t("instructorBuilder.questionBankPageSubtitle")}
            </p>
          </div>
          <button
            onClick={() => setShowCreateBankModal(true)}
            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md shadow-blue-500/10 transition-all flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>{t("instructorBuilder.addQuestionBankBtn")}</span>
          </button>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-slate-500">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span>{t("instructorBuilder.loading")}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Panel - Question Banks Directory */}
            <div className="lg:col-span-4 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                Danh sách Kho đề ({banks.length})
              </h2>

              {banks.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
                  <p className="text-sm font-semibold">{t("instructorBuilder.noQuestionBanks")}</p>
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
                            ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-500 ring-1 ring-blue-500"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                            {bank.category === "MODULE_EXAM"
                              ? "Tuần"
                              : bank.category === "FINAL_EXAM"
                              ? "Cuối khóa"
                              : "Luyện tập"}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            ID: {bank.id}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 mt-1">
                          {bank.title}
                        </h3>
                        {bank.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                            {bank.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mt-2 border-t border-slate-100 dark:border-slate-800/60 pt-2 w-full">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
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
                <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-4">
                  <svg className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20" />
                  </svg>
                  <div>
                    <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                      Chưa chọn Kho ngân hàng đề
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Vui lòng chọn một Kho đề thi ở danh sách bên trái hoặc tạo Kho mới để bắt đầu quản lý danh sách câu hỏi.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Selected Bank Banner */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
                          {selectedBank.title}
                        </h2>
                        <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">
                          ID: {selectedBank.id}
                        </span>
                      </div>
                      {selectedBank.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {selectedBank.description}
                        </p>
                      )}
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-400 pt-1">
                        {t("instructorBuilder.totalQuestionsLabel")} {selectedBank.questions?.length || 0}
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
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>{t("instructorBuilder.addQuestionBtn")}</span>
                    </button>
                  </div>

                  {/* Questions List */}
                  {(!selectedBank.questions || selectedBank.questions.length === 0) ? (
                    <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500 p-8 space-y-3">
                      <svg className="w-10 h-10 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-semibold">{t("instructorBuilder.noQuestionsInBank")}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedBank.questions.map((q, idx) => {
                        return (
                          <div
                            key={q.id}
                            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                          >
                            {/* Question Meta */}
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-extrabold text-slate-400">
                                CÂU HỎI {idx + 1}
                              </span>

                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                  q.difficulty === "EASY"
                                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : q.difficulty === "MEDIUM"
                                    ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                }`}>
                                  {q.difficulty === "EASY"
                                    ? t("instructorBuilder.difficultyEasy")
                                    : q.difficulty === "MEDIUM"
                                    ? t("instructorBuilder.difficultyMedium")
                                    : t("instructorBuilder.difficultyHard")}
                                </span>
                                <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded mr-2">
                                  {q.questionType}
                                </span>

                                <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
                                  <button
                                    onClick={() => handleOpenEditQuestionModal(q)}
                                    className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title={t("common.edit") || "Sửa"}
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-2.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => setDeletingQuestionId(q.id)}
                                    className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title={t("common.delete") || "Xóa"}
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Question Text */}
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                              {q.text}
                            </p>

                            {/* Options List */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                              {q.options?.map((opt, oIdx) => (
                                <div
                                  key={opt.id || oIdx}
                                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs ${
                                    opt.isCorrect
                                      ? "bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold"
                                      : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400"
                                  }`}
                                >
                                  {opt.isCorrect ? (
                                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px] shadow-xs flex-shrink-0">
                                      ✓
                                    </span>
                                  ) : (
                                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-400 flex-shrink-0">
                                      {oIdx + 1}
                                    </span>
                                  )}
                                  <span className="flex-1">{opt.optionText}</span>
                                </div>
                              ))}
                            </div>

                            {/* Answer Explanation */}
                            {q.explanation && (
                              <div className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
                                <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Lời giải thích:</span>
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
        title={t("instructorBuilder.createBankTitle")}
      >
        <form onSubmit={handleCreateBank} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              {t("instructorBuilder.bankTitleLabel")} *
            </label>
            <input
              type="text"
              required
              value={newBankTitle}
              onChange={(e) => setNewBankTitle(e.target.value)}
              placeholder="Ví dụ: Kho thi kết thúc Tuần 1: Khái niệm AI"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              {t("instructorBuilder.bankCategoryLabel")}
            </label>
            <select
              value={newBankCategory}
              onChange={(e) => setNewBankCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-hidden"
            >
              <option value="PRACTICE">{t("instructorBuilder.categoryPractice")}</option>
              <option value="MODULE_EXAM">{t("instructorBuilder.categoryModuleExam")}</option>
              <option value="FINAL_EXAM">{t("instructorBuilder.categoryFinalExam")}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              {t("instructorBuilder.bankDescLabel")}
            </label>
            <textarea
              rows={3}
              value={newBankDesc}
              onChange={(e) => setNewBankDesc(e.target.value)}
              placeholder="Mô tả tóm tắt nội dung các câu hỏi trong kho này..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowCreateBankModal(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {t("instructorBuilder.cancelBtn")}
            </button>
            <button
              type="submit"
              disabled={creatingBank}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs cursor-pointer"
            >
              {creatingBank ? t("instructorBuilder.creatingBtn") : t("instructorBuilder.createBankSubmitBtn")}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- Modal Add Question --- */}
      <Modal
        isOpen={showAddQuestionModal}
        onClose={() => setShowAddQuestionModal(false)}
        title={editingQuestionId ? t("instructorBuilder.editQuestionTitle") : t("instructorBuilder.addQuestionTitle")}
        size="lg"
      >
        <form onSubmit={handleAddQuestion} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              {t("instructorBuilder.questionTextLabel")} *
            </label>
            <textarea
              required
              rows={3}
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder="Nhập nội dung câu hỏi..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                {t("instructorBuilder.questionTypeLabel")}
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
                    // Switch back to empty list if switching away from True/False
                    setQOptions([
                      { optionText: "", isCorrect: false },
                      { optionText: "", isCorrect: false },
                    ]);
                  } else if (val === "SINGLE_CHOICE") {
                    // Switch to SINGLE_CHOICE: keep at most one correct option
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
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="SINGLE_CHOICE">Trắc nghiệm 1 đáp án (Single Choice)</option>
                <option value="MULTIPLE_CHOICE">Trắc nghiệm nhiều đáp án (Multiple Choice)</option>
                <option value="TRUE_FALSE">Chọn Đúng/Sai (True/False)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                {t("instructorBuilder.questionDifficultyLabel")}
              </label>
              <select
                value={qDifficulty}
                onChange={(e) => setQDifficulty(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="EASY">{t("instructorBuilder.difficultyEasy")}</option>
                <option value="MEDIUM">{t("instructorBuilder.difficultyMedium")}</option>
                <option value="HARD">{t("instructorBuilder.difficultyHard")}</option>
              </select>
            </div>
          </div>

          {/* Options Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t("instructorBuilder.questionOptionsLabel")} *
              </label>
              {qType !== "TRUE_FALSE" && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  {t("instructorBuilder.addOptionRowBtn")}
                </button>
              )}
            </div>

            <div className="space-y-2">
              {qOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2.5">
                  {/* Correct Selector Badge */}
                  <label className="flex items-center justify-center p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-800 cursor-pointer" title={t("instructorBuilder.optionCorrectTooltip")}>
                    <input
                      type={qType === "MULTIPLE_CHOICE" ? "checkbox" : "radio"}
                      name="correct_option"
                      checked={opt.isCorrect}
                      onChange={(e) => handleOptionCorrectChange(idx, e.target.checked)}
                      className="w-4 h-4 text-emerald-600 accent-emerald-500 focus:ring-0 cursor-pointer"
                    />
                  </label>

                  {/* Option Text Input */}
                  <input
                    type="text"
                    required
                    value={opt.optionText}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    disabled={qType === "TRUE_FALSE"}
                    placeholder={t("instructorBuilder.optionTextPlaceholder")}
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />

                  {/* Remove option button */}
                  {qType !== "TRUE_FALSE" && qOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              {t("instructorBuilder.questionExplanationLabel")}
            </label>
            <textarea
              rows={2}
              value={qExplanation}
              onChange={(e) => setQExplanation(e.target.value)}
              placeholder="Nhập lời giải thích chi tiết khi học viên làm sai..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddQuestionModal(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {t("instructorBuilder.cancelBtn")}
            </button>
            <button
              type="submit"
              disabled={submittingQuestion}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs cursor-pointer"
            >
              {submittingQuestion
                ? t("instructorBuilder.savingBtn")
                : editingQuestionId
                ? t("instructorBuilder.editQuestionSubmitBtn")
                : t("instructorBuilder.addQuestionSubmitBtn")}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deletingQuestionId !== null}
        onClose={() => setDeletingQuestionId(null)}
        onConfirm={handleDeleteQuestion}
        title={t("instructorBuilder.confirmDeleteQuestionTitle")}
        description={t("instructorBuilder.confirmDeleteQuestionDesc")}
        confirmText={t("common.delete") || "Xóa"}
        cancelText={t("instructorBuilder.cancelBtn")}
        variant="danger"
        isLoading={deleteQuestionMutation.isPending}
      />
    </div>
  );
}
