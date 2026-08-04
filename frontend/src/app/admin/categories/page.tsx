"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type Category } from "@/gen/catalog/v1/catalog_pb";

import {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
} from "@/lib/query_hooks";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { ConfirmAlertDialog } from "@/components/ui/AlertDialog";

const CategoryList = ({
  title,
  items,
  type,
  handleDelete,
  noCategoriesText,
  deleteText,
}: {
  title: string;
  items: Category[];
  type: string;
  handleDelete: (id: string, type: string) => void;
  noCategoriesText: string;
  deleteText: string;
}) => (
  <div className="bg-card rounded-2xl shadow-sm border border-border p-6 flex-1">
    <h3 className="text-xl font-bold mb-4 text-foreground">
      {title} ({items.length})
    </h3>
    {items.length === 0 ? (
      <p className="text-muted-foreground text-sm">{noCategoriesText}</p>
    ) : (
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex justify-between items-center bg-muted p-3 rounded-lg border border-border"
          >
            <div>
              <p className="font-semibold text-foreground">{item.name}</p>
              <p className="text-xs text-muted-foreground">Slug: {item.slug}</p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(item.id, type)}
              title={deleteText}
            >
              {deleteText}
            </Button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default function AdminCategoriesPage() {
  const router = useRouter();
  const toast = useToast();

  const { isSuperAdmin } = useAuth();
  const isAdmin = isSuperAdmin;

  const { data: subjects = [], refetch: refetchSubjects } = useCategoriesQuery("SUBJECT");
  const { data: levels = [], refetch: refetchLevels } = useCategoriesQuery("LEVEL");

  const createCategoryMutation = useCreateCategoryMutation();
  const deleteCategoryMutation = useDeleteCategoryMutation();

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"SUBJECT" | "LEVEL">("SUBJECT");
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: string } | null>(null);

  if (!isAdmin)
    return <div className="p-8 text-center text-destructive font-bold">{"Từ chối truy cập"}</div>;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      setErrorMsg("");
      await createCategoryMutation.mutateAsync({ name: newName, type: newType });
      setNewName("");
      if (newType === "SUBJECT") refetchSubjects();
      else refetchLevels();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to create category");
    }
  };

  const handleDelete = (id: string, type: string) => {
    setDeleteTarget({ id, type });
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategoryMutation.mutateAsync({ id: deleteTarget.id });
      if (deleteTarget.type === "SUBJECT") refetchSubjects();
      else refetchLevels();
      toast.success("Xóa danh mục thành công!");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Không thể xoá danh mục");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-6 py-12 flex-1">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground text-balance">
            {"Danh mục quản trị"}
          </h1>
          <p className="text-muted-foreground mt-2">{"Quản lý danh mục khóa học"}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/dashboard")}>
          &larr; {"Về trang quản trị"}
        </Button>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 text-foreground">{"Thêm danh mục mới"}</h2>
        <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <Input
              label="Tên danh mục"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nhập tên danh mục"
              required
            />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {"Loại danh mục"}
            </label>
            <Select
              value={newType}
              onValueChange={(val) => {
                if (val) setNewType(val as "SUBJECT" | "LEVEL");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Loại danh mục">
                  {newType === "SUBJECT" ? "Chủ đề" : "Cấp độ"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUBJECT">{"Chủ đề"}</SelectItem>
                <SelectItem value="LEVEL">{"Cấp độ"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            isLoading={createCategoryMutation.isPending}
            className="w-full md:w-auto"
          >
            Thêm danh mục
          </Button>
        </form>
        {errorMsg && <p className="text-destructive text-sm mt-3">{errorMsg}</p>}
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <CategoryList
          title={"Danh sách chủ đề"}
          items={subjects}
          type="SUBJECT"
          handleDelete={handleDelete}
          noCategoriesText={"Chưa có danh mục"}
          deleteText={"Xoá"}
        />
        <CategoryList
          title={"Danh sách cấp độ"}
          items={levels}
          type="LEVEL"
          handleDelete={handleDelete}
          noCategoriesText={"Chưa có danh mục"}
          deleteText={"Xoá"}
        />
      </div>

      <ConfirmAlertDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={executeDelete}
        title="Xác nhận xóa danh mục"
        description="Bạn có chắc chắn muốn xóa danh mục này? Thao tác này không thể hoàn tác."
        confirmText="Xóa danh mục"
        cancelText="Hủy"
        variant="danger"
        isLoading={deleteCategoryMutation.isPending}
      />
    </main>
  );
}
