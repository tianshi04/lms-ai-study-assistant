"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { type Category } from "@/gen/catalog/v1/catalog_pb";
import { UserRole } from "@/gen/identity/v1/identity_pb";
import { useCategoriesQuery, useCreateCategoryMutation, useDeleteCategoryMutation, useUserProfileQuery } from "@/lib/query_hooks";

const CategoryList = ({ title, items, type, handleDelete }: { title: string, items: Category[], type: string, handleDelete: (id: string, type: string) => void }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex-1">
    <h3 className="text-xl font-bold mb-4">{title} ({items.length})</h3>
    {items.length === 0 ? <p className="text-slate-500 text-sm">No categories found.</p> : (
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
              title="Delete"
            >
              Delete
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

  if (profileLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!isAdmin) return <div className="p-8 text-center text-red-500">Access Denied. Super Admins only.</div>;

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
    if (!window.confirm("Are you sure you want to delete this category?")) return;
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
            <h1 className="text-3xl font-extrabold tracking-tight">Category Management</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Manage dynamic Course Subjects and Levels</p>
          </div>
          <button onClick={() => router.push("/admin/dashboard")} className="text-sm font-medium text-blue-600 hover:underline">
            &larr; Back to Dashboard
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Add New Category</h2>
          <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
              <input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Graphic Design"
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div className="w-full md:w-48">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
              <select 
                value={newType} 
                onChange={(e) => setNewType(e.target.value as "SUBJECT" | "LEVEL")}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="SUBJECT">Subject</option>
                <option value="LEVEL">Level</option>
              </select>
            </div>
            <button 
              type="submit" 
              disabled={createCategoryMutation.isPending}
              className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-70"
            >
              {createCategoryMutation.isPending ? "Adding..." : "Add Category"}
            </button>
          </form>
          {errorMsg && <p className="text-red-500 text-sm mt-3">{errorMsg}</p>}
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <CategoryList title="Subjects" items={subjects} type="SUBJECT" handleDelete={handleDelete} />
          <CategoryList title="Levels" items={levels} type="LEVEL" handleDelete={handleDelete} />
        </div>
      </main>
    </div>
  );
}
