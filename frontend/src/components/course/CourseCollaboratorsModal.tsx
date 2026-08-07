"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmAlertDialog } from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, SelectItem } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import {
  useCourseCollaboratorsQuery,
  useAddCourseCollaboratorMutation,
  useRemoveCourseCollaboratorMutation,
} from "@/lib/query_hooks";
import { mapConnectError } from "@/lib/connect_error_mapper";
import { UserPlus, Trash2, Mail, Loader2, UserCheck, GraduationCap } from "lucide-react";

interface CourseCollaboratorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle?: string;
}

export const CourseCollaboratorsModal: React.FC<CourseCollaboratorsModalProps> = ({
  isOpen,
  onClose,
  courseId,
  courseTitle,
}) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("CO_INSTRUCTOR");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [removingMember, setRemovingMember] = useState<{
    userId: string;
    memberName: string;
  } | null>(null);

  const {
    data: collaborators = [],
    isLoading,
    isError,
  } = useCourseCollaboratorsQuery(courseId, {
    enabled: isOpen && !!courseId,
  });

  const addCollaboratorMutation = useAddCourseCollaboratorMutation({
    onSuccess: () => {
      setSuccessMsg("Đã mời người hợp tác vào khóa học thành công!");
      setErrorMsg("");
      setEmail("");
    },
    onError: (err) => {
      setErrorMsg(mapConnectError(err, "Không thể mời người hợp tác vào khóa học."));
      setSuccessMsg("");
    },
  });

  const removeCollaboratorMutation = useRemoveCourseCollaboratorMutation({
    onSuccess: () => {
      setSuccessMsg("Đã xóa người hợp tác khỏi khóa học thành công!");
      setErrorMsg("");
    },
    onError: (err) => {
      setErrorMsg(mapConnectError(err, "Không thể xóa người hợp tác."));
      setSuccessMsg("");
    },
  });

  const handleAddCollaborator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Vui lòng nhập email người dùng.");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    addCollaboratorMutation.mutate({
      courseId,
      email: email.trim(),
      role,
    });
  };

  const handleRemoveCollaborator = (userId: string, memberName: string) => {
    setRemovingMember({ userId, memberName });
  };

  const executeRemoveCollaborator = () => {
    if (!removingMember) return;
    setErrorMsg("");
    setSuccessMsg("");
    removeCollaboratorMutation.mutate(
      { courseId, userId: removingMember.userId },
      {
        onSettled: () => setRemovingMember(null),
      },
    );
  };

  const getRoleBadge = (collabRole: string) => {
    switch (collabRole.toLowerCase()) {
      case "co_instructor":
      case "đồng giảng viên":
        return (
          <Badge variant="verified" className="gap-1">
            <UserCheck className="w-3.5 h-3.5" aria-hidden="true" /> Đồng giảng viên
          </Badge>
        );
      case "ta":
      case "trợ giảng":
        return (
          <Badge variant="warning" className="gap-1">
            <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" /> Trợ giảng (TA)
          </Badge>
        );
      default:
        return (
          <Badge variant="default" className="gap-1">
            {collabRole}
          </Badge>
        );
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Quản lý Người hợp tác Khóa học"
        description={
          courseTitle
            ? `Mời Đồng giảng viên (Co-Instructor) hoặc Trợ giảng (TA) tham gia quản lý khóa học "${courseTitle}".`
            : "Chủ sở hữu khóa học có quyền mời Đồng giảng viên (Co-Instructor) hoặc Trợ giảng (TA)."
        }
        size="lg"
      >
        <div className="space-y-6">
          {/* Form thêm người hợp tác */}
          <form
            onSubmit={handleAddCollaborator}
            className="bg-muted/40 p-4 rounded-xl border border-border space-y-4"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" aria-hidden="true" />
              Mời Người hợp tác mới qua Email
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-6">
                <label
                  htmlFor="collaborator-email"
                  className="block text-xs font-medium text-muted-foreground mb-1"
                >
                  Email người dùng <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Mail
                    className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <Input
                    id="collaborator-email"
                    type="email"
                    placeholder="nhap.email@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="sm:col-span-4">
                <label
                  htmlFor="collaborator-role"
                  className="block text-xs font-medium text-muted-foreground mb-1"
                >
                  Vai trò trong Khóa học
                </label>
                <Select value={role} onValueChange={(val) => setRole(val || "co_instructor")}>
                  <SelectItem value="co_instructor">Đồng giảng viên (Co-Instructor)</SelectItem>
                  <SelectItem value="ta">Trợ giảng (TA)</SelectItem>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  isLoading={addCollaboratorMutation.isPending}
                >
                  Mời
                </Button>
              </div>
            </div>
          </form>

          {/* Thông báo lỗi / thành công */}
          {errorMsg && (
            <div className="p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 text-xs rounded-lg bg-success/10 text-success border border-success/20">
              {successMsg}
            </div>
          )}

          {/* Danh sách người hợp tác */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span>Danh sách Người hợp tác hiện tại</span>
              <span className="text-xs text-muted-foreground font-normal">
                Tổng cộng: {collaborators.length} người
              </span>
            </h3>

            {isLoading ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground text-sm">
                <Loader2 aria-hidden="true" className="w-5 h-5 animate-spin mr-2" /> Đang tải danh
                sách…
              </div>
            ) : isError ? (
              <div className="p-4 text-center text-sm text-destructive bg-destructive/5 rounded-lg">
                Không thể tải danh sách người hợp tác.
              </div>
            ) : collaborators.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                Chưa có Đồng giảng viên hoặc Trợ giảng nào được thêm vào khóa học này.
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card">
                {collaborators.map((c) => (
                  <div
                    key={c.collaboratorId || c.userId}
                    className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                        {c.fullName ? c.fullName.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground flex items-center gap-2">
                          {c.fullName || "Người dùng"}
                          {getRoleBadge(c.role)}
                        </div>
                        <div className="text-xs text-muted-foreground">{c.email}</div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleRemoveCollaborator(c.userId, c.fullName || c.email)}
                      isLoading={removeCollaboratorMutation.isPending}
                      title="Xóa khỏi khóa học"
                      aria-label="Xóa khỏi khóa học"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmAlertDialog
        isOpen={Boolean(removingMember)}
        onClose={() => setRemovingMember(null)}
        onConfirm={executeRemoveCollaborator}
        title="Xác nhận xóa thành viên"
        description={
          removingMember
            ? `Bạn có chắc chắn muốn xóa "${removingMember.memberName}" khỏi khóa học?`
            : ""
        }
        confirmText="Xóa thành viên"
        cancelText="Hủy"
        variant="danger"
        isLoading={removeCollaboratorMutation.isPending}
      />
    </>
  );
};
