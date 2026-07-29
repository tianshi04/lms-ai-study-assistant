"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";

export function GlobalSearch() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Use inline debounce if hook doesn't exist
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: results, isLoading } = useQuery({
    queryKey: ["globalSearchAutocomplete", debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch.trim()) return [];
      const client = getRpcClient(CatalogService);
      const res = await client.searchCoursesAutocomplete({
        searchQuery: debouncedSearch,
        limit: 5,
      });
      return res.results;
    },
    enabled: debouncedSearch.trim().length > 0,
  });

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      setIsOpen(false);
      router.push(`/courses?searchQuery=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleResultClick = (courseId: string) => {
    setIsOpen(false);
    setSearchTerm("");
    router.push(`/courses/${courseId}`);
  };

  return (
    <div className="relative w-full max-w-md hidden md:block" ref={dropdownRef}>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-full leading-5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 sm:text-sm transition-all"
          placeholder="Tìm kiếm khóa học..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {isLoading && searchTerm.trim().length > 0 && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          </div>
        )}
      </div>

      {isOpen && debouncedSearch.trim().length > 0 && (
        <div className="absolute mt-2 w-full bg-white dark:bg-slate-900 rounded-xl shadow-lg shadow-slate-200/50 dark:shadow-black/50 border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-96 overflow-y-auto p-2">
            {results === undefined || isLoading ? (
              <div className="p-4 text-sm text-center text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang tìm kiếm...
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-sm text-center text-slate-500 dark:text-slate-400">
                Không tìm thấy kết quả nào cho &quot;{debouncedSearch}&quot;
              </div>
            ) : (
              <ul className="space-y-1">
                {results.map((course) => (
                  <li key={course.id}>
                    <button
                      onClick={() => handleResultClick(course.id)}
                      className="w-full text-left flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-12 h-12 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                        {course.partnerLogoUrl ? (
                          <Image
                            src={course.partnerLogoUrl}
                            alt={course.partnerName}
                            width={48}
                            height={48}
                            unoptimized
                            className="object-contain w-full h-full p-1"
                          />
                        ) : (
                          <span className="text-xs font-bold text-slate-400">IMG</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {course.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {course.partnerName}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {results && results.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push(`/courses?searchQuery=${encodeURIComponent(searchTerm.trim())}`);
                  }}
                  className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                >
                  Xem tất cả kết quả
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
