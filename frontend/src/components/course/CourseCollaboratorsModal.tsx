"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import {
  useCourseCollaboratorsQuery,
  useAddCourseCollaboratorMutation,
  useRemoveCourseCollaboratorMutation,
} from "@/lib/query_hooks";
import { mapConnectError } from "@/lib/connect_error_mapper";
import { UserPlus, Trash2, Mail, UserCheck, GraduationCap } from "lucide-react";
import { Progress } from "@/components/ui/Progress";

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
          <Badge variant="primary" className="gap-1">
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
          <Badge variant="secondary" className="gap-1">
            {collabRole}
          </Badge>
        );
    }
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <Dialog.Content size="lg">
          <Dialog.Header>
            <Dialog.Icon icon={<UserPlus className="w-6 h-6 text-primary" aria-hidden="true" />} />
            <Dialog.Title>Quản lý Người hợp tác Khóa học</Dialog.Title>
            <Dialog.Description>
              {courseTitle
                ? `Mời Đồng giảng viên (Co-Instructor) hoặc Trợ giảng (TA) tham gia quản lý khóa học "${courseTitle}".`
                : "Chủ sở hữu khóa học có quyền mời Đồng giảng viên (Co-Instructor) hoặc Trợ giảng (TA)."}
            </Dialog.Description>
          </Dialog.Header>
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
                      inputMode="email"
                      autoComplete="email"
                      enterKeyHint="send"
                      spellCheck={false}
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
                    <Select.Item value="co_instructor">Đồng giảng viên (Co-Instructor)</Select.Item>
                    <Select.Item value="ta">Trợ giảng (TA)</Select.Item>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Button
                    type="submit"
                    variant="filled"
                    className="w-full"
                    disabled={addCollaboratorMutation.isPending}
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
                <div className="flex items-center justify-center p-8 text-muted-foreground text-sm gap-2">
                  <Progress.Circular size="sm" ariaLabel="Đang tải danh sách" />
                  <span>Đang tải danh sách…</span>
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

                      <IconButton
                        variant="standard"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleRemoveCollaborator(c.userId, c.fullName || c.email)}
                        disabled={removeCollaboratorMutation.isPending}
                        title="Xóa khỏi khóa học"
                        aria-label="Xóa khỏi khóa học"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </IconButton>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog>

      <Dialog
        open={Boolean(removingMember)}
        onOpenChange={(open) => {
          if (!open) setRemovingMember(null);
        }}
      >
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Icon
              className="bg-destructive/10 text-destructive"
              icon={<Trash2 className="w-6 h-6 text-destructive" aria-hidden="true" />}
            />
            <Dialog.Title>Xác nhận xóa thành viên</Dialog.Title>
            <Dialog.Description>
              {removingMember
                ? `Bạn có chắc chắn muốn xóa "${removingMember.memberName}" khỏi khóa học?`
                : ""}
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Button variant="text" onClick={() => setRemovingMember(null)}>
              Hủy
            </Button>
            <Button
              variant="filled"
              className="bg-error text-on-error hover:bg-error/90 active:bg-error/80"
              onClick={executeRemoveCollaborator}
              disabled={removeCollaboratorMutation.isPending}
            >
              Xóa thành viên
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </>
  );
};
