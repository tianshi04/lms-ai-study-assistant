"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 14l9-5-9-5-9 5 9 5z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
            />
          </svg>
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
