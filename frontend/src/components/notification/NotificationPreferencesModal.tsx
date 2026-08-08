"use client";

import { useState, useEffect } from "react";
import { Bell, Mail, BookOpen, MessageSquare, Megaphone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

import { Switch } from "@/components/ui/Switch";
import {
  useNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} from "@/lib/query_hooks";

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPreferencesModal({
  isOpen,
  onClose,
}: NotificationPreferencesModalProps) {
  const { data: prefs, isLoading } = useNotificationPreferencesQuery();
  const updateMutation = useUpdateNotificationPreferencesMutation();

  const [enableInApp, setEnableInApp] = useState(true);
  const [enableEmail, setEnableEmail] = useState(true);
  const [enableAcademicReminders, setEnableAcademicReminders] = useState(true);
  const [enableCommunityReplies, setEnableCommunityReplies] = useState(true);
  const [enableAnnouncements, setEnableAnnouncements] = useState(true);

  useEffect(() => {
    if (prefs) {
      setEnableInApp(prefs.enableInApp);
      setEnableEmail(prefs.enableEmail);
      setEnableAcademicReminders(prefs.enableAcademicReminders);
      setEnableCommunityReplies(prefs.enableCommunityReplies);
      setEnableAnnouncements(prefs.enableAnnouncements);
    }
  }, [prefs]);

  const handleSave = () => {
    updateMutation.mutate(
      {
        $typeName: "notification.v1.NotificationPreferences",
        enableInApp,
        enableEmail,
        enableAcademicReminders,
        enableCommunityReplies,
        enableAnnouncements,
      },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Content size="md">
        <Dialog.Header>
          <Dialog.Title>Cài đặt Thông báo</Dialog.Title>
          <Dialog.Description>Tùy chỉnh kênh và danh mục nhận thông báo</Dialog.Description>
        </Dialog.Header>

        {isLoading ? (
          <div className="py-12 flex justify-center items-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
          </div>
        ) : (
          <div className="py-2 space-y-4 max-h-[60vh] overflow-y-auto pr-1 my-2">
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Kênh nhận thông báo
              </h4>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Thông báo Nội sàn (In-App Feed)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Hiển thị quả chuông trên thanh điều hướng
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enableInApp}
                  onCheckedChange={(checked) => setEnableInApp(checked)}
                  aria-label="Thông báo Nội sàn"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Thông báo qua Email</p>
                    <p className="text-xs text-muted-foreground">
                      Gửi thư điện tử cho các sự kiện quan trọng
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enableEmail}
                  onCheckedChange={(checked) => setEnableEmail(checked)}
                  aria-label="Thông báo qua Email"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Danh mục thông báo
              </h4>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Nhắc nhở học tập</p>
                    <p className="text-xs text-muted-foreground">
                      Lịch học, deadline bài tập và tiến độ khóa học
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enableAcademicReminders}
                  onCheckedChange={(checked) => setEnableAcademicReminders(checked)}
                  aria-label="Nhắc nhở học tập"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Hoạt động thảo luận</p>
                    <p className="text-xs text-muted-foreground">
                      Phản hồi bài viết, nhắc đến bạn trong diễn đàn
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enableCommunityReplies}
                  onCheckedChange={(checked) => setEnableCommunityReplies(checked)}
                  aria-label="Hoạt động thảo luận"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
                <div className="flex items-center gap-3">
                  <Megaphone className="w-4 h-4 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Thông báo hệ thống</p>
                    <p className="text-xs text-muted-foreground">
                      Cập nhật tính năng mới và thông báo từ ban quản trị
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enableAnnouncements}
                  onCheckedChange={(checked) => setEnableAnnouncements(checked)}
                  aria-label="Thông báo hệ thống"
                />
              </div>
            </div>
          </div>
        )}

        <Dialog.Footer>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2"
          >
            {updateMutation.isPending && (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            )}
            <span>Lưu cài đặt</span>
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
