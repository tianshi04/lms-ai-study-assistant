"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";

export default function VerifyPortalPage() {
  const router = useRouter();

  const [certId, setCertId] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (certId.trim()) {
      router.push(`/verify/${certId.trim()}`);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-16 w-full flex-1 flex flex-col justify-center">
      <div className="bg-card border border-border rounded-3xl p-8 sm:p-12 shadow-xl text-center space-y-6 text-foreground">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-3xl mx-auto border border-primary/20">
          <GraduationCap className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">
            {"Xác minh & Tra cứu Chứng chỉ"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            {
              "Nhập Mã chứng chỉ (Certificate ID) để tra cứu tính hợp lệ và chi tiết bằng cấp trực tuyến."
            }
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 pt-2">
          <input
            type="text"
            value={certId}
            onChange={(e) => setCertId(e.target.value)}
            placeholder={"Nhập mã chứng chỉ (ví dụ: CERT-DEMO12345)…"}
            autoComplete="off"
            spellCheck={false}
            className="flex-1 px-4 py-3 rounded-xl border border-input bg-card text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
            required
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/20 transition-colors cursor-pointer"
          >
            {"Tra cứu Chứng chỉ"}
          </button>
        </form>

        <div className="pt-4 border-t border-border flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Demo Certificate Code:</span>
          <button
            onClick={() => router.push("/verify/CERT-DEMO12345")}
            className="font-mono text-primary hover:underline font-bold cursor-pointer"
          >
            CERT-DEMO12345
          </button>
        </div>
      </div>
    </main>
  );
}
