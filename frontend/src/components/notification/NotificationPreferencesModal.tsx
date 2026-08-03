"use client";

import { useState, useEffect } from "react";
import {
  X,
  Settings2,
  Bell,
  Mail,
  BookOpen,
  MessageSquare,
  Megaphone,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
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

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        $typeName: "notification.v1.NotificationPreferences",
        enableInApp,
        enableEmail,
        enableAcademicReminders,
        enableCommunityReplies,
        enableAnnouncements,
      });
      onClose();
    } catch {
      // Handled via mutation state
    }
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0">
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Settings2 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Cài đặt Thông báo</h3>
              <p className="text-xs text-muted-foreground">
                Tùy chỉnh kênh và danh mục nhận thông báo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Đóng cài đặt"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Form Body */}
        {isLoading ? (
          <div className="py-12 flex justify-center items-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
          </div>
        ) : (
          <div className="py-5 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
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
                <input
                  type="checkbox"
                  checked={enableInApp}
                  onChange={(e) => setEnableInApp(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
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
                <input
                  type="checkbox"
                  checked={enableEmail}
                  onChange={(e) => setEnableEmail(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Danh mục nội dung
              </h4>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Học tập & Hạn nộp bài</p>
                    <p className="text-xs text-muted-foreground">
                      Nhắc nhở bài thi, trễ hạn, đơn Financial Aid
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableAcademicReminders}
                  onChange={(e) => setEnableAcademicReminders(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-purple-500" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Diễn đàn & Tương tác</p>
                    <p className="text-xs text-muted-foreground">
                      Phản hồi câu hỏi, ghim câu trả lời chuẩn
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableCommunityReplies}
                  onChange={(e) => setEnableCommunityReplies(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
                <div className="flex items-center gap-3">
                  <Megaphone className="w-4 h-4 text-rose-500" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Thông báo từ Khóa học</p>
                    <p className="text-xs text-muted-foreground">
                      Truyền thông, lịch livestream từ Giảng viên
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableAnnouncements}
                  onChange={(e) => setEnableAnnouncements(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
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
        </div>
      </div>
    </div>
  );
}
