"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

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
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Content size="md">
        <Dialog.Header>
          <Dialog.Title>{isEdit ? "Chỉnh sửa Bài học" : "Thêm Bài học Mới (Lesson)"}</Dialog.Title>
        </Dialog.Header>
        <form onSubmit={handleSubmit} className="space-y-4 my-2">
          <Input
            label="Tên Bài học"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: 1.1 Khái niệm cơ bản về Perceptron"
            required
          />

          <Input
            label="Thời lượng ước tính (Phút)"
            type="number"
            min={1}
            value={minutes}
            onChange={(e) => setMinutes(parseInt(e.target.value) || 1)}
            required
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
              {isEdit ? "Cập nhật Bài học" : "Xác nhận tạo Bài học"}
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog>
  );
}
