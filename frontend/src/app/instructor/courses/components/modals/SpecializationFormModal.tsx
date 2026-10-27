"use client";

import { useEffect, useState, useMemo } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { Badge } from "@/components/ui/Badge";
import { Surface } from "@/components/ui/Surface";
import { Progress } from "@/components/ui/Progress";
import { useToast } from "@/components/ui/Toast";
import {
  useInstructorCoursesQuery,
  useCreateSpecializationMutation,
  useUpdateSpecializationMutation,
} from "@/lib/queries/useCatalogQueries";
import type { Specialization, Course } from "@/gen/catalog/v1/catalog_pb";
import { Layers, ArrowUp, ArrowDown, ShieldCheck, BookOpen, Sparkles, Info, X } from "lucide-react";

interface SpecializationFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Specialization | null;
  onSuccess?: () => void;
}

export function SpecializationFormModal({
  open,
  onOpenChange,
  initialData,
  onSuccess,
}: SpecializationFormModalProps) {
  const toast = useToast();
  const isEdit = Boolean(initialData);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [partnerName, setPartnerName] = useState("DeepLearning.AI");
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);

  // Fetch all instructor's courses
  const { data: courses = [], isLoading: isLoadingCourses } = useInstructorCoursesQuery();

  // Map courses by ID for quick lookup
  const coursesMap = useMemo(() => {
    const map = new Map<string, Course>();
    for (const c of courses) {
      map.set(c.id, c);
    }
    return map;
  }, [courses]);

  // Mutations
  const createMutation = useCreateSpecializationMutation();
  const updateMutation = useUpdateSpecializationMutation();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Initialize or reset form when modal opens or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        setTitle(initialData.title || "");
        setDescription(initialData.description || "");
        setPartnerName(initialData.partnerName || "DeepLearning.AI");
        const existingIds = initialData.courses?.map((c) => c.id) || [];
        setSelectedCourseIds(existingIds);
      } else {
        setTitle("");
        setDescription("");
        setPartnerName("DeepLearning.AI");
        setSelectedCourseIds([]);
      }
    }
  }, [open, initialData]);

  // Course Selection Handlers
  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourseIds((prev) => {
      if (prev.includes(courseId)) {
        return prev.filter((id) => id !== courseId);
      } else {
        return [...prev, courseId];
      }
    });
  };

  const moveCourseUp = (index: number) => {
    if (index <= 0) return;
    setSelectedCourseIds((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const moveCourseDown = (index: number) => {
    if (index >= selectedCourseIds.length - 1) return;
    setSelectedCourseIds((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const removeCourse = (courseId: string) => {
    setSelectedCourseIds((prev) => prev.filter((id) => id !== courseId));
  };

  // Pricing calculations (Platform Enforced: 25% discount for combo >= 2 courses)
  const pricing = useMemo(() => {
    let totalIndividual = 0;
    for (const id of selectedCourseIds) {
      const c = coursesMap.get(id);
      if (c && c.price > 0) {
        totalIndividual += c.price;
      }
    }

    const hasCombo = selectedCourseIds.length >= 2;
    const discountPercent = hasCombo ? 25 : 0;
    const bundlePrice = hasCombo
      ? Math.round((totalIndividual * 0.75) / 10000) * 10000
      : totalIndividual;
    const savings = totalIndividual - bundlePrice;

    return {
      totalIndividual,
      bundlePrice,
      savings,
      discountPercent,
      hasCombo,
    };
  }, [selectedCourseIds, coursesMap]);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Vui lòng nhập tên Chuyên ngành.");
      return;
    }

    if (selectedCourseIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 khóa học vào Chuyên ngành.");
      return;
    }

    try {
      if (isEdit && initialData) {
        await updateMutation.mutateAsync({
          id: initialData.id,
          title: title.trim(),
          description: description.trim(),
          partnerName: partnerName.trim() || "Hệ thống LMS",
          partnerLogoUrl: initialData.partnerLogoUrl,
          courseIds: selectedCourseIds,
        });
        toast.success(`Đã cập nhật Chuyên ngành "${title.trim()}" thành công!`);
      } else {
        await createMutation.mutateAsync({
          title: title.trim(),
          description: description.trim(),
          partnerName: partnerName.trim() || "Hệ thống LMS",
          courseIds: selectedCourseIds,
        });
        toast.success(`Đã tạo Chuyên ngành "${title.trim()}" thành công!`);
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Thao tác thất bại. Vui lòng thử lại.";
      toast.error(msg);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content size="2xl" className="max-h-[90vh] overflow-y-auto">
        <Dialog.Header>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <Dialog.Title>
                {isEdit ? "Chỉnh sửa Chuyên ngành" : "Tạo Chuyên ngành mới (Specialization)"}
              </Dialog.Title>
              <Dialog.Description className="mt-1">
                {
                  "Gom nhóm các khóa học thành lộ trình học tập bài bản, áp dụng ưu đãi trọn gói chuẩn Nền tảng."
                }
              </Dialog.Description>
            </div>
          </div>
        </Dialog.Header>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="spec-title"
                className="block text-sm font-semibold text-foreground mb-1"
              >
                {"Tên Chuyên ngành"} <span className="text-destructive">*</span>
              </label>
              <Input
                id="spec-title"
                placeholder="VD: Deep Learning & MLOps Specialization"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="spec-partner"
                  className="block text-sm font-semibold text-foreground mb-1"
                >
                  {"Tổ chức / Đối tác đào tạo"}
                </label>
                <Input
                  id="spec-partner"
                  placeholder="VD: DeepLearning.AI, Stanford University"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">
                  {"Số môn học đã chọn"}
                </label>
                <div className="h-10 px-3.5 flex items-center rounded-xl bg-muted/60 border border-border text-sm text-foreground font-semibold">
                  <BookOpen className="w-4 h-4 mr-2 text-primary" aria-hidden="true" />
                  <span>{`${selectedCourseIds.length} khóa học`}</span>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="spec-desc"
                className="block text-sm font-semibold text-foreground mb-1"
              >
                {"Mô tả mục tiêu lộ trình"}
              </label>
              <Textarea
                id="spec-desc"
                rows={3}
                placeholder="Mô tả kỹ năng người học sẽ làm chủ sau khi hoàn thành toàn bộ lộ trình này..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Section 2: Platform Fixed Discount Rule Notice (Option 1 Enforced) */}
          <Surface variant="low" shape="xl" className="p-4 border border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-foreground">
                    {"Chính sách giá & Chiết khấu trọn gói Nền tảng (Quy tắc sàn)"}
                  </h4>
                  <Badge variant="success" className="px-2 py-0.5 text-xs font-bold">
                    {"Giảm 25% tự động"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {
                    "Theo chính sách thương mại của Nền tảng (Chuẩn Coursera), mọi gói Chuyên ngành gom từ 2 môn trở lên sẽ tự động áp dụng ưu đãi cố định 25%. Giảng viên tập trung thiết kế lộ trình đào tạo, hệ thống tự động khóa giá sàn để bảo vệ uy tín và quyền lợi chung."
                  }
                </p>

                {/* Real-time Pricing Preview */}
                <div className="pt-3 mt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-baseline gap-3">
                    <span className="text-xs text-muted-foreground">
                      {"Tổng giá bán gói combo:"}
                    </span>
                    {pricing.hasCombo ? (
                      <>
                        <span className="text-lg font-extrabold text-primary">
                          {pricing.bundlePrice > 0
                            ? `${pricing.bundlePrice.toLocaleString("vi-VN")} đ`
                            : "Miễn phí"}
                        </span>
                        {pricing.totalIndividual > pricing.bundlePrice && (
                          <span className="text-xs line-through text-muted-foreground">
                            {`${pricing.totalIndividual.toLocaleString("vi-VN")} đ`}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-sm font-semibold text-foreground">
                        {pricing.totalIndividual > 0
                          ? `${pricing.totalIndividual.toLocaleString("vi-VN")} đ`
                          : "0 đ"}
                      </span>
                    )}
                  </div>

                  {pricing.hasCombo && pricing.savings > 0 && (
                    <span className="text-xs font-semibold text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/20">
                      {`Học viên tiết kiệm: ${pricing.savings.toLocaleString("vi-VN")} đ (-25%)`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Surface>

          {/* Section 3: Course Selection & Sequence Ordering */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  {"Lộ trình học tập & Thứ tự các môn"}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {"Sắp xếp thứ tự các môn học theo trình tự sư phạm từ nền tảng đến nâng cao."}
                </p>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                {`${selectedCourseIds.length} môn đã chọn`}
              </span>
            </div>

            {/* Selected Courses with Reordering */}
            {selectedCourseIds.length > 0 ? (
              <div className="space-y-2 border border-border rounded-2xl p-3 bg-muted/20">
                {selectedCourseIds.map((cid, index) => {
                  const course = coursesMap.get(cid);
                  if (!course) return null;
                  return (
                    <div
                      key={cid}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border/80 shadow-xs transition-colors hover:border-primary/40"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {course.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {course.price > 0
                              ? `${course.price.toLocaleString("vi-VN")} đ`
                              : "Miễn phí"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <IconButton
                          type="button"
                          variant="standard"
                          size="xs"
                          onClick={() => moveCourseUp(index)}
                          disabled={index === 0}
                          aria-label={`Di chuyển môn ${course.title} lên trên`}
                        >
                          <ArrowUp className="w-4 h-4" aria-hidden="true" />
                        </IconButton>
                        <IconButton
                          type="button"
                          variant="standard"
                          size="xs"
                          onClick={() => moveCourseDown(index)}
                          disabled={index === selectedCourseIds.length - 1}
                          aria-label={`Di chuyển môn ${course.title} xuống dưới`}
                        >
                          <ArrowDown className="w-4 h-4" aria-hidden="true" />
                        </IconButton>
                        <IconButton
                          type="button"
                          variant="standard"
                          size="xs"
                          onClick={() => removeCourse(cid)}
                          aria-label={`Bỏ môn ${course.title} khỏi lộ trình`}
                          className="text-destructive hover:bg-destructive/10 ml-1"
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                        </IconButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-border rounded-2xl bg-muted/10">
                <Info className="w-6 h-6 mx-auto text-muted-foreground mb-2" aria-hidden="true" />
                <p className="text-sm font-medium text-foreground">
                  {"Chưa có môn học nào được thêm vào lộ trình"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {"Hãy chọn các khóa học dưới đây để bắt đầu xây dựng lộ trình."}
                </p>
              </div>
            )}

            {/* Checkbox List of Available Instructor Courses */}
            <div className="pt-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {"Danh sách khóa học của bạn"}
              </label>

              {isLoadingCourses ? (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  <Progress.Circular size="sm" className="mr-2" />
                  <span>{"Đang tải danh sách khóa học..."}</span>
                </div>
              ) : courses.length === 0 ? (
                <div className="p-4 rounded-xl bg-muted/40 text-center text-sm text-muted-foreground">
                  {
                    "Bạn chưa có khóa học nào được tạo. Vui lòng tạo khóa học trước khi gom thành Chuyên ngành."
                  }
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-border rounded-xl p-2 bg-muted/10">
                  {courses.map((course) => {
                    const isSelected = selectedCourseIds.includes(course.id);
                    return (
                      <label
                        key={course.id}
                        htmlFor={`course-pick-${course.id}`}
                        className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary/10 border border-primary/20 text-foreground"
                            : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <Checkbox
                            id={`course-pick-${course.id}`}
                            checked={isSelected}
                            onCheckedChange={() => toggleCourseSelection(course.id)}
                            aria-label={`Chọn khóa học ${course.title}`}
                          />
                          <span className="text-sm font-medium truncate">{course.title}</span>
                        </div>
                        <span className="text-xs font-semibold shrink-0">
                          {course.price > 0
                            ? `${course.price.toLocaleString("vi-VN")} đ`
                            : "Miễn phí"}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <Dialog.Footer className="pt-4 border-t border-border">
            <Button
              type="button"
              variant="outlined"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {"Hủy"}
            </Button>
            <Button
              type="submit"
              variant="filled"
              disabled={isSubmitting || selectedCourseIds.length === 0}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Progress.Circular size="sm" />
                  <span>{"Đang lưu..."}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  <span>{isEdit ? "Cập nhật Chuyên ngành" : "Tạo Chuyên ngành"}</span>
                </>
              )}
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
