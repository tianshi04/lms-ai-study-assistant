"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type Category } from "@/gen/catalog/v1/catalog_pb";
import { SystemRole } from "@/gen/identity/v1/identity_pb";
import {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useUserProfileQuery,
} from "@/lib/query_hooks";

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
            <button
              onClick={() => handleDelete(item.id, type)}
              className="text-destructive hover:bg-destructive/10 p-2 rounded-md transition-colors"
              title={deleteText}
            >
              {deleteText}
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

import { useAuth } from "@/components/providers/AuthProvider";

export default function AdminCategoriesPage() {
  const router = useRouter();

  const { userId: authUserId } = useAuth();
  const userId = authUserId || "";
  const { data: userProfile, isLoading: profileLoading } = useUserProfileQuery(userId);
  const isAdmin = userProfile?.systemRole === SystemRole.SUPER_ADMIN;

  const { data: subjects = [], refetch: refetchSubjects } = useCategoriesQuery("SUBJECT");
  const { data: levels = [], refetch: refetchLevels } = useCategoriesQuery("LEVEL");

  const createCategoryMutation = useCreateCategoryMutation();
  const deleteCategoryMutation = useDeleteCategoryMutation();

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"SUBJECT" | "LEVEL">("SUBJECT");
  const [errorMsg, setErrorMsg] = useState("");

  if (profileLoading)
    return (
      <div aria-live="polite" className="p-8 text-center text-muted-foreground">
        {"Đang tải…"}
      </div>
    );
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

  const handleDelete = async (id: string, type: string) => {
    if (!window.confirm("Xác nhận xoá")) return;
    try {
      await deleteCategoryMutation.mutateAsync({ id });
      if (type === "SUBJECT") refetchSubjects();
      else refetchLevels();
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to delete category");
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
        <button
          onClick={() => router.push("/admin/dashboard")}
          className="text-sm font-medium text-primary hover:underline"
        >
          &larr; {"Về trang quản trị"}
        </button>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 text-foreground">{"Thêm danh mục mới"}</h2>
        <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              {"Tên danh mục"}
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={"Nhập tên danh mục"}
              className="w-full border border-input rounded-xl px-4 py-2.5 bg-muted text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              required
            />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              {"Loại danh mục"}
            </label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as "SUBJECT" | "LEVEL")}
              className="w-full border border-input rounded-xl px-4 py-2.5 bg-muted text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <option value="SUBJECT">{"Chủ đề"}</option>
              <option value="LEVEL">{"Cấp độ"}</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={createCategoryMutation.isPending}
            className="w-full md:w-auto px-6 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground font-medium rounded-xl transition-colors disabled:opacity-70"
          >
            <span aria-live="polite">
              {createCategoryMutation.isPending ? "Đang thêm…" : "Thêm danh mục"}
            </span>
          </button>
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
    </main>
  );
}
