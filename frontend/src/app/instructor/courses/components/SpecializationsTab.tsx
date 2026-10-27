"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useInstructorSpecializationsQuery,
  useDeleteSpecializationMutation,
} from "@/lib/queries/useCatalogQueries";
import type { Specialization } from "@/gen/catalog/v1/catalog_pb";
import { SpecializationFormModal } from "./modals/SpecializationFormModal";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Progress } from "@/components/ui/Progress";
import { useToast } from "@/components/ui/Toast";
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  BookOpen,
  Award,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";

interface SpecializationsTabProps {
  isInstructorOrAdmin: boolean;
  onOpenCreate?: () => void;
}

export function SpecializationsTab({ isInstructorOrAdmin }: SpecializationsTabProps) {
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<Specialization | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const { data: specializations = [], isLoading, refetch } = useInstructorSpecializationsQuery();

  const deleteMutation = useDeleteSpecializationMutation();

  const handleOpenCreate = () => {
    if (!isInstructorOrAdmin) {
      toast.error("Chỉ tài khoản Giảng viên (Instructor) mới có quyền tạo Chuyên ngành.");
      return;
    }
    setEditingSpec(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (spec: Specialization) => {
    if (!isInstructorOrAdmin) {
      toast.error("Chỉ tài khoản Giảng viên (Instructor) mới có quyền chỉnh sửa Chuyên ngành.");
      return;
    }
    setEditingSpec(spec);
    setFormOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTarget) return;
    try {
      await deleteMutation.mutateAsync({ id: deletingTarget.id });
      toast.success(`Đã xóa Chuyên ngành "${deletingTarget.title}" thành công.`);
      setDeletingTarget(null);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xóa Chuyên ngành thất bại.";
      toast.error(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Progress.Circular size="md" className="mb-3 text-primary" />
        <span aria-live="polite">{"Đang tải danh sách Chuyên ngành..."}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subheader action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              {"Lộ trình Chuyên ngành (Specializations)"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {"Gói từ 2 môn học trở lên để tự động nhận ưu đãi 25% chuẩn Nền tảng."}
            </p>
          </div>
        </div>

        <Button
          onClick={handleOpenCreate}
          variant="filled"
          className="gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>{"Tạo Chuyên ngành mới"}</span>
        </Button>
      </div>

      {/* Specializations List */}
      {specializations.length === 0 ? (
        <Surface
          variant="low"
          shape="2xl"
          className="p-12 text-center border border-dashed border-border"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <Layers className="w-8 h-8" aria-hidden="true" />
          </div>
          <h4 className="text-lg font-bold text-foreground mb-2">
            {"Chưa có Chuyên ngành nào được tạo"}
          </h4>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-6 leading-relaxed">
            {
              "Hãy kết nối các khóa học của bạn thành một lộ trình học tập chuyên sâu, giúp người học phát triển kỹ năng toàn diện từ nền tảng đến thực chiến và nhận chứng chỉ chuyên ngành."
            }
          </p>
          <Button onClick={handleOpenCreate} variant="filled" className="gap-2 cursor-pointer">
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>{"Tạo Chuyên ngành đầu tiên"}</span>
          </Button>
        </Surface>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {specializations.map((spec) => {
            const coursesList = spec.courses || [];
            const hasCombo = coursesList.length >= 2;
            const savings =
              spec.totalIndividualPrice > spec.bundlePrice
                ? spec.totalIndividualPrice - spec.bundlePrice
                : 0;

            return (
              <Surface
                key={spec.id}
                variant="low"
                shape="2xl"
                className="p-6 border border-border transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  {/* Left Column: Details & Roadmap */}
                  <div className="space-y-4 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{"Chuyên ngành (Specialization)"}</span>
                      </span>

                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground">
                        {spec.partnerName || "DeepLearning.AI"}
                      </span>

                      {hasCombo && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-success/10 text-success border border-success/30 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{"-25% Giá sàn Nền tảng"}</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xl font-bold text-foreground">{spec.title}</h4>
                      {spec.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {spec.description}
                        </p>
                      )}
                    </div>

                    {/* Courses Sequence Roadmap */}
                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                        <span>{`Lộ trình gồm ${coursesList.length} khóa học:`}</span>
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {coursesList.length > 0 ? (
                          coursesList.map((c, index) => (
                            <div
                              key={c.id}
                              className="flex items-center gap-2.5 p-2 rounded-xl bg-card border border-border/80 text-xs"
                            >
                              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">
                                {index + 1}
                              </span>
                              <span className="font-semibold text-foreground truncate flex-1">
                                {c.title}
                              </span>
                              <span className="text-muted-foreground shrink-0">
                                {c.price > 0 ? `${c.price.toLocaleString("vi-VN")} đ` : "Miễn phí"}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-muted-foreground italic">
                            {"Chưa tải được danh sách khóa học hoặc khóa học đã bị gỡ."}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Pricing & Action Controls */}
                  <div className="flex flex-col justify-between items-start lg:items-end gap-4 shrink-0 lg:w-72 lg:border-l lg:border-border lg:pl-6 pt-4 lg:pt-0 border-t border-border lg:border-t-0">
                    <div className="lg:text-right space-y-1">
                      <p className="text-xs text-muted-foreground">{"Giá trọn gói Chuyên ngành"}</p>
                      <div className="flex items-baseline gap-2 lg:justify-end">
                        <span className="text-2xl font-black text-primary">
                          {spec.bundlePrice > 0
                            ? `${spec.bundlePrice.toLocaleString("vi-VN")} đ`
                            : "Miễn phí"}
                        </span>
                        {spec.totalIndividualPrice > spec.bundlePrice && (
                          <span className="text-sm line-through text-muted-foreground">
                            {`${spec.totalIndividualPrice.toLocaleString("vi-VN")} đ`}
                          </span>
                        )}
                      </div>

                      {savings > 0 && (
                        <p className="text-xs font-semibold text-success">
                          {`Tiết kiệm ${savings.toLocaleString("vi-VN")} đ (-25%)`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full lg:justify-end pt-2">
                      {coursesList.length > 0 && (
                        <Link
                          href={`/courses/${coursesList[0].id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-colors"
                          aria-label={`Xem trang chi tiết khóa học đầu tiên trong chuyên ngành ${spec.title}`}
                          title="Xem trang chi tiết môn đầu tiên"
                        >
                          <ExternalLink className="w-4 h-4" aria-hidden="true" />
                        </Link>
                      )}

                      <Button
                        variant="outlined"
                        size="sm"
                        onClick={() => handleOpenEdit(spec)}
                        className="gap-1.5"
                      >
                        <Pencil className="w-4 h-4" aria-hidden="true" />
                        <span>{"Chỉnh sửa"}</span>
                      </Button>

                      <Button
                        variant="outlined"
                        size="sm"
                        onClick={() => setDeletingTarget({ id: spec.id, title: spec.title })}
                        className="text-destructive hover:bg-destructive/10 hover:border-destructive/30 p-2"
                        aria-label={`Xóa chuyên ngành ${spec.title}`}
                        title="Xóa chuyên ngành"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Surface>
            );
          })}
        </div>
      )}

      {/* Specialization Form Modal (Create / Edit) */}
      <SpecializationFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        initialData={editingSpec}
        onSuccess={() => refetch()}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog.Root
        open={Boolean(deletingTarget)}
        onOpenChange={(open) => !open && setDeletingTarget(null)}
      >
        <Dialog.Content size="md">
          <Dialog.Header>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <Dialog.Title>{"Xác nhận xóa Chuyên ngành"}</Dialog.Title>
                <Dialog.Description className="mt-1">
                  {"Thao tác này sẽ gỡ bỏ gói Chuyên ngành khỏi hệ thống."}
                </Dialog.Description>
              </div>
            </div>
          </Dialog.Header>

          <div className="py-4 text-sm text-foreground">
            {"Bạn có chắc chắn muốn xóa Chuyên ngành "}
            <strong>&quot;{deletingTarget?.title}&quot;</strong>
            {"? Các khóa học đơn lẻ trong chuyên ngành vẫn được giữ nguyên."}
          </div>

          <Dialog.Footer className="pt-4 border-t border-border">
            <Button
              type="button"
              variant="outlined"
              onClick={() => setDeletingTarget(null)}
              disabled={deleteMutation.isPending}
            >
              {"Hủy"}
            </Button>
            <Button
              type="button"
              variant="filled"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Progress.Circular size="sm" />
                  <span>{"Đang xóa..."}</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                  <span>{"Xóa Chuyên ngành"}</span>
                </>
              )}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}
