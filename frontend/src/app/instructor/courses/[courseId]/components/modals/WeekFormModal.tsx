"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";

interface WeekFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, summary: string) => Promise<boolean>;
  initialTitle?: string;
  initialSummary?: string;
  isEdit?: boolean;
  saving: boolean;
}

export function WeekFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialTitle = "",
  initialSummary = "",
  isEdit = false,
  saving,
}: WeekFormModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [summary, setSummary] = useState(initialSummary);

  useEffect(() => {
    setTitle(initialTitle);
    setSummary(initialSummary);
  }, [initialTitle, initialSummary, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSubmit(title, summary);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Chỉnh sửa Tuần học" : "Thêm Tuần học Mới (Week Module)"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            {"Tiêu đề Tuần học"}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={"Ví dụ: Week 1: Giới thiệu về Neural Networks"}
            className="w-full px-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            {"Mô tả tóm tắt"}
          </label>
          <textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={"Tóm tắt nội dung chính học viên sẽ thu hoạch được…"}
            className="w-full px-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

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
              {saving ? "Đang lưu…" : isEdit ? "Cập nhật Tuần học" : "Xác nhận tạo Tuần học"}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
