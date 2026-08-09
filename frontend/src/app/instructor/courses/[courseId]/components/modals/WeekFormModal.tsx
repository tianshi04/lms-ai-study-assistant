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
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              {"Tiêu đề Tuần học"}
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={"Ví dụ: Week 1: Giới thiệu về Neural Networks"}
              className="py-2.5 rounded-xl bg-card text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              {"Mô tả tóm tắt"}
            </label>
            <Textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={"Tóm tắt nội dung chính học viên sẽ thu hoạch được…"}
              className="p-2.5 rounded-xl bg-card text-sm"
            />
          </div>

          <Dialog.Footer>
            <Button
              type="button"
              variant="outlined"
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
