"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { type Category } from "@/gen/catalog/v1/catalog_pb";
import { UserRole } from "@/gen/identity/v1/identity_pb";
import { useCategoriesQuery, useCreateCategoryMutation, useDeleteCategoryMutation, useUserProfileQuery } from "@/lib/query_hooks";
import { useTranslation } from "@/lib/i18n/TranslationProvider";

const CategoryList = ({ title, items, type, handleDelete, noCategoriesText, deleteText }: { title: string, items: Category[], type: string, handleDelete: (id: string, type: string) => void, noCategoriesText: string, deleteText: string }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex-1">
    <h3 className="text-xl font-bold mb-4">{title} ({items.length})</h3>
    {items.length === 0 ? <p className="text-slate-500 text-sm">{noCategoriesText}</p> : (
      <ul className="space-y-2">
        {items.map(item => (
          <li key={item.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <div>
              <p className="font-semibold">{item.name}</p>
              <p className="text-xs text-slate-500">Slug: {item.slug}</p>
            </div>
            <button 
              onClick={() => handleDelete(item.id, type)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-md transition-colors"
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

const emptySubscribe = () => () => {};

export default function AdminCategoriesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  
  const userId = isMounted && typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";
  const { data: userProfile, isLoading: profileLoading } = useUserProfileQuery(userId);
  const isAdmin = userProfile?.role === UserRole.SUPER_ADMIN;

  const { data: subjects = [], refetch: refetchSubjects } = useCategoriesQuery("SUBJECT");
  const { data: levels = [], refetch: refetchLevels } = useCategoriesQuery("LEVEL");
  
  const createCategoryMutation = useCreateCategoryMutation();
  const deleteCategoryMutation = useDeleteCategoryMutation();

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"SUBJECT" | "LEVEL">("SUBJECT");
  const [errorMsg, setErrorMsg] = useState("");

  if (profileLoading) return <div className="p-8 text-center">{t("adminCategories.loading")}</div>;
  if (!isAdmin) return <div className="p-8 text-center text-red-500">{t("adminCategories.accessDenied")}</div>;

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
    if (!window.confirm(t("adminCategories.confirmDelete"))) return;
    try {
      await deleteCategoryMutation.mutateAsync({ id });
      if (type === "SUBJECT") refetchSubjects();
      else refetchLevels();
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to delete category");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{t("adminCategories.title")}</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">{t("adminCategories.subtitle")}</p>
          </div>
          <button onClick={() => router.push("/admin/dashboard")} className="text-sm font-medium text-blue-600 hover:underline">
            &larr; {t("adminCategories.backToDashboard")}
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">{t("adminCategories.addNewCategory")}</h2>
          <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("adminCategories.nameLabel")}</label>
              <input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("adminCategories.namePlaceholder")}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div className="w-full md:w-48">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("adminCategories.typeLabel")}</label>
              <select 
                value={newType} 
                onChange={(e) => setNewType(e.target.value as "SUBJECT" | "LEVEL")}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="SUBJECT">{t("adminCategories.subjectOption")}</option>
                <option value="LEVEL">{t("adminCategories.levelOption")}</option>
              </select>
            </div>
            <button 
              type="submit" 
              disabled={createCategoryMutation.isPending}
              className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-70"
            >
              {createCategoryMutation.isPending ? t("adminCategories.addingBtn") : t("adminCategories.addBtn")}
            </button>
          </form>
          {errorMsg && <p className="text-red-500 text-sm mt-3">{errorMsg}</p>}
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <CategoryList title={t("adminCategories.subjectsTitle")} items={subjects} type="SUBJECT" handleDelete={handleDelete} noCategoriesText={t("adminCategories.noCategories")} deleteText={t("adminCategories.deleteBtn")} />
          <CategoryList title={t("adminCategories.levelsTitle")} items={levels} type="LEVEL" handleDelete={handleDelete} noCategoriesText={t("adminCategories.noCategories")} deleteText={t("adminCategories.deleteBtn")} />
        </div>
      </main>
    </div>
  );
}
