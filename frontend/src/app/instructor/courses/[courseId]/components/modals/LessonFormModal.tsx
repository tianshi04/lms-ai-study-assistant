"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Chỉnh sửa Bài học" : "Thêm Bài học Mới (Lesson)"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            {"Tên Bài học"}
          </label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={"Ví dụ: 1.1 Khái niệm cơ bản về Perceptron"}
            className="py-2.5 rounded-xl bg-card text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            {"Thời lượng ước tính (Phút)"}
          </label>
          <Input
            type="number"
            min={1}
            value={minutes}
            onChange={(e) => setMinutes(parseInt(e.target.value) || 1)}
            className="py-2.5 rounded-xl bg-card text-sm"
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl text-xs font-bold"
          >
            {"Hủy"}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={saving}
            isLoading={saving}
            className="rounded-xl text-xs font-bold shadow-md"
          >
            {isEdit ? "Cập nhật Bài học" : "Xác nhận tạo Bài học"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
