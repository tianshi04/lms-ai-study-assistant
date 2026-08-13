"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";

import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

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
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Content size="md">
        <Dialog.Header>
          <Dialog.Title>
            {isEdit ? "Chỉnh sửa Tuần học" : "Thêm Tuần học Mới (Week Module)"}
          </Dialog.Title>
        </Dialog.Header>
        <form onSubmit={handleSubmit} className="space-y-4 my-2">
          <Input
            label="Tiêu đề Tuần học"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Week 1: Giới thiệu về Neural Networks"
            required
          />

          <Textarea
            label="Mô tả tóm tắt"
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Tóm tắt nội dung chính học viên sẽ thu hoạch được…"
          />

          <Dialog.Footer>
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
              {isEdit ? "Cập nhật Tuần học" : "Xác nhận tạo Tuần học"}
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog>
  );
}
