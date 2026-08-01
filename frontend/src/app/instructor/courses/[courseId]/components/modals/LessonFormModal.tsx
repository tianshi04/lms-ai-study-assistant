"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";

interface LessonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, estimatedMinutes: number) => Promise<boolean>;
  initialTitle?: string;
  initialMinutes?: number;
  isEdit?: boolean;
  saving: boolean;
}

export function LessonFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialTitle = "",
  initialMinutes = 15,
  isEdit = false,
  saving,
}: LessonFormModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [minutes, setMinutes] = useState(initialMinutes);

  useEffect(() => {
    setTitle(initialTitle);
    setMinutes(initialMinutes);
  }, [initialTitle, initialMinutes, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSubmit(title, minutes);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Chỉnh sửa Bài học" : "Thêm Bài học Mới (Lesson)"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            {"Tên Bài học"}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={"Ví dụ: 1.1 Khái niệm cơ bản về Perceptron"}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            {"Thời lượng ước tính (Phút)"}
          </label>
          <input
            type="number"
            min={1}
            value={minutes}
            onChange={(e) => setMinutes(parseInt(e.target.value) || 1)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors"
          >
            {"Hủy"}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-md hover:bg-blue-500 transition-all disabled:opacity-50"
          >
            <span aria-live="polite">
              {saving ? "Đang lưu…" : isEdit ? "Cập nhật Bài học" : "Xác nhận tạo Bài học"}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
