"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/shared/Badge";

import {
  useOrganizationMembersQuery,
  useAddOrganizationMemberMutation,
  useRemoveOrganizationMemberMutation,
} from "@/lib/query_hooks";
import { mapConnectError } from "@/lib/connect_error_mapper";
import { UserPlus, Trash2, Shield, Loader2, UserCheck } from "lucide-react";

interface OrganizationMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId?: string;
}

export const OrganizationMembersModal: React.FC<OrganizationMembersModalProps> = ({
  isOpen,
  onClose,
  organizationId = "partner_community",
}) => {
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [removingMember, setRemovingMember] = useState<{
    userId: string;
    memberName: string;
  } | null>(null);

  const {
    data: members = [],
    isLoading,
    isError,
    refetch,
  } = useOrganizationMembersQuery(organizationId, {
    enabled: isOpen,
  });

  const addMemberMutation = useAddOrganizationMemberMutation({
    onSuccess: (data) => {
      setSuccessMsg(`Đã thêm ${data.email || "thành viên"} vào tổ chức thành công!`);
      setErrorMsg("");
      setEmail("");
      refetch();
    },
    onError: (err) => {
      setErrorMsg(mapConnectError(err, "Không thể thêm thành viên vào tổ chức."));
      setSuccessMsg("");
    },
  });

  const removeMemberMutation = useRemoveOrganizationMemberMutation({
    onSuccess: () => {
      setSuccessMsg("Đã xóa thành viên khỏi tổ chức thành công!");
      setErrorMsg("");
      refetch();
    },
    onError: (err) => {
      setErrorMsg(mapConnectError(err, "Không thể xóa thành viên."));
      setSuccessMsg("");
    },
  });

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Vui lòng nhập email người dùng.");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    addMemberMutation.mutate({
      organizationId,
      email: email.trim(),
      roleId: "INSTRUCTOR",
    });
  };

  const handleRemoveMember = (userId: string, memberName: string) => {
    setRemovingMember({ userId, memberName });
  };

  const executeRemoveMember = () => {
    if (!removingMember) return;
    setErrorMsg("");
    setSuccessMsg("");
    removeMemberMutation.mutate(
      { organizationId, userId: removingMember.userId },
      {
        onSettled: () => setRemovingMember(null),
      },
    );
  };

  const getRoleBadge = (roleName?: string) => {
    const lowerRole = roleName?.toLowerCase() || "";
    if (lowerRole.includes("owner") || lowerRole.includes("admin")) {
      return (
        <Badge variant="primary" className="gap-1">
          <Shield className="w-3.5 h-3.5" aria-hidden="true" /> Chủ sở hữu
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <UserCheck className="w-3.5 h-3.5" aria-hidden="true" /> Giảng viên
      </Badge>
    );
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Mời Giảng viên vào Tổ chức</DialogTitle>
            <DialogDescription>
              Chỉ Owner/Admin của Tổ chức mới có quyền mời thành viên mới vào làm Giảng viên
              (Instructor) cho Organization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 my-4">
            {/* Form thêm giảng viên */}
            <form
              onSubmit={handleAddMember}
              className="bg-muted/40 p-4 rounded-xl border border-border space-y-4"
            >
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" aria-hidden="true" />
                Mời Giảng viên mới qua Email
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-9">
                  <Input
                    type="email"
                    placeholder="nhap.email@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="sm:col-span-3">
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    isLoading={addMemberMutation.isPending}
                  >
                    Mời Giảng viên
                  </Button>
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                  {errorMsg}
                </p>
              )}

              {successMsg && (
                <p className="text-xs text-success bg-success/10 p-2.5 rounded-lg border border-success/20">
                  {successMsg}
                </p>
              )}
            </form>

            {/* Danh sách thành viên */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center justify-between">
                <span>Danh sách thành viên hiện tại ({members.length})</span>
                {isLoading && (
                  <Loader2
                    className="w-4 h-4 animate-spin text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
              </h3>

              {isError && (
                <div className="p-4 text-center text-xs text-destructive bg-destructive/10 rounded-xl">
                  Không thể tải danh sách thành viên tổ chức.
                </div>
              )}

              {!isLoading && members.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                  Chưa có thành viên nào trong Organization này.
                </div>
              )}

              {members.length > 0 && (
                <div className="divide-y divide-border rounded-xl border border-border overflow-hidden bg-card">
                  {members.map((member) => (
                    <div
                      key={member.memberId || member.userId}
                      className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm uppercase shrink-0">
                          {member.fullName ? member.fullName.charAt(0) : "U"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {member.fullName || "Người dùng"}
                            </span>
                            {getRoleBadge(member.roleName || member.roleId)}
                          </div>
                          <span className="text-xs text-muted-foreground">{member.email}</span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleRemoveMember(member.userId, member.fullName || member.email)
                        }
                        isLoading={removeMemberMutation.isPending}
                        aria-label={`Xóa thành viên ${member.fullName || member.email}`}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(removingMember)}
        onOpenChange={(open) => {
          if (!open) setRemovingMember(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa thành viên</AlertDialogTitle>
            <AlertDialogDescription>
              {removingMember
                ? `Bạn có chắc chắn muốn xóa "${removingMember.memberName}" khỏi tổ chức?`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setRemovingMember(null)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={executeRemoveMember}
              isLoading={removeMemberMutation.isPending}
            >
              Xóa thành viên
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
