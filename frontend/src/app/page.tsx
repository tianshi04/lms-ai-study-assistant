"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient } from "@connectrpc/connect";
import { GreetService } from "@/gen/greet/v1/greet_pb";

// Create transport and client
const transport = createConnectTransport({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

const client = createClient(GreetService, transport);

export default function Home() {
  const [name, setName] = useState("");
  const [greeting, setGreeting] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<{ time: string; type: "info" | "success" | "error"; message: string }[]>([]);

  // Function to add local logs
  const addLog = (type: "info" | "success" | "error", message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ time, type, message }, ...prev]);
  };

  // Check backend status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        await client.greet({ name: "Ping" });
        setIsBackendOnline(true);
        addLog("success", "Backend connection established (http://localhost:8000)");
      } catch {
        setIsBackendOnline(false);
        addLog("error", "Failed to connect to backend server. Make sure it is running on port 8000.");
      }
    };
    checkStatus();
  }, []);

  const handleGreet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    addLog("info", `Sending GreetRequest { name: "${name}" }`);
    const startTime = performance.now();

    try {
      const response = await client.greet({ name });
      const duration = (performance.now() - startTime).toFixed(1);
      setGreeting(response.greeting);
      addLog("success", `Received GreetResponse { greeting: "${response.greeting}" } in ${duration}ms`);
      setIsBackendOnline(true);
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      addLog("error", `Request failed: ${errorMessage}`);
      setGreeting("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.15),transparent_40%),radial-gradient(circle_at_70%_80%,rgba(99,102,241,0.15),transparent_40%)] pointer-events-none" />

      {/* Navigation Header */}
      <header className="relative z-30 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              C
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">Coursera AI LMS</h1>
              <p className="text-xs text-slate-400">Modular Monolith DDD Platform</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <Link
              href="/courses"
              className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-3.5 py-1.5 rounded-lg border border-blue-500/20"
            >
              📚 Browse Catalog
            </Link>

            <div className="flex items-center space-x-2">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isBackendOnline ? 'bg-emerald-400' : isBackendOnline === false ? 'bg-rose-400' : 'bg-amber-400'}`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isBackendOnline ? 'bg-emerald-500' : isBackendOnline === false ? 'bg-rose-500' : 'bg-amber-500'}`} />
              </span>
              <span className="text-xs font-medium text-slate-300">
                {isBackendOnline ? "Backend: Online" : isBackendOnline === false ? "Backend: Offline" : "Checking..."}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner with CTA */}
      <section className="relative z-20 max-w-7xl mx-auto px-6 pt-16 pb-12 text-center md:text-left grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            ✨ Track A Live: Catalog, Video Player & Learning Progress
          </div>

          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Nền tảng Học tập Thông minh Tích hợp <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Coursera AI Coach</span>
          </h2>

          <p className="text-slate-400 text-lg leading-relaxed max-w-2xl">
            Trải nghiệm các khóa học chuẩn quốc tế với Video tương tác, Phụ đề cuộn thông minh (Interactive Transcript), In-Video Quiz ngắt ngang, và quản lý lịch học linh hoạt (Flexible Deadlines).
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/courses"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/25 flex items-center gap-2 group"
            >
              Xem Danh Sách Khóa Học (Catalog)
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <Link
              href="/learn/course-python-ai"
              className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-sm transition-all flex items-center gap-2"
            >
              🎬 Demo Course Player
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/courses"
            className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/50 transition-all text-left group"
          >
            <div className="text-2xl mb-3">🎓</div>
            <h3 className="font-bold text-white text-base mb-1 group-hover:text-blue-400 transition-colors">Course Catalog</h3>
            <p className="text-xs text-slate-400">Xem danh sách khóa học Specialization theo chuẩn Coursera.</p>
          </Link>

          <Link
            href="/learn/course-python-ai"
            className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/50 transition-all text-left group"
          >
            <div className="text-2xl mb-3">🎬</div>
            <h3 className="font-bold text-white text-base mb-1 group-hover:text-blue-400 transition-colors">Interactive Player</h3>
            <p className="text-xs text-slate-400">Phát Video + Interactive Transcript cuộn & In-Video Quiz.</p>
          </Link>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 text-left">
            <div className="text-2xl mb-3">⏰</div>
            <h3 className="font-bold text-white text-base mb-1">Reset Deadlines</h3>
            <p className="text-xs text-slate-400">Gia hạn lịch nộp bài linh hoạt không trừ điểm thi.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 text-left">
            <div className="text-2xl mb-3">📌</div>
            <h3 className="font-bold text-white text-base mb-1">Personal Notes</h3>
            <p className="text-xs text-slate-400">Bôi đen bài giảng & lưu ghi chú cá nhân tức thì.</p>
          </div>
        </div>
      </section>

      {/* Bottom Section - ConnectRPC Status Console */}
      <main className="relative z-10 max-w-7xl w-full mx-auto px-6 py-8 border-t border-slate-900 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Greet Form */}
        <section className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl">
            <h3 className="text-sm font-semibold mb-4 flex items-center justify-between text-white">
              <span>ConnectRPC Connection Test</span>
              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">GreetService</span>
            </h3>

            <form onSubmit={handleGreet} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập tên kiểm tra kết nối RPC..."
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all disabled:opacity-50"
              >
                {isLoading ? "Đang gửi RPC..." : "Gửi GreetRequest"}
              </button>
            </form>

            {greeting && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                {greeting}
              </div>
            )}
          </div>
        </section>

        {/* Right Column - Logs Console */}
        <section className="lg:col-span-6 space-y-4">
          <div className="border border-slate-800 rounded-2xl bg-slate-900/60 backdrop-blur-xl flex flex-col h-[220px]">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
              <h3 className="font-semibold text-xs text-slate-300">Terminal Log Console</h3>
              <button 
                onClick={() => setLogs([])}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                Clear
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[11px]">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-600">
                  Chưa có nhật ký kết nối.
                </div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="flex items-start space-x-2 text-slate-400">
                    <span className="text-slate-600 shrink-0">[{log.time}]</span>
                    <span className={`shrink-0 font-bold ${
                      log.type === 'success' ? 'text-emerald-400' :
                      log.type === 'error' ? 'text-rose-400' :
                      'text-sky-400'
                    }`}>
                      {log.type.toUpperCase()}:
                    </span>
                    <span className="text-slate-300 break-all">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 py-6 text-center text-xs text-slate-600 relative z-10">
        <p>© 2026 Coursera LMS Platform. Built with Next.js 15, ConnectRPC, and Tailwind CSS v4.</p>
      </footer>
    </div>
  );
}
