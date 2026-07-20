"use client";

import { useState, useEffect } from "react";
import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient } from "@connectrpc/connect";
import { GreetService } from "@/gen/greet/v1/greet_pb";

// Create transport and client
const transport = createConnectTransport({
  baseUrl: "http://localhost:8000",
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
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      addLog("error", `Request failed: ${errorMessage}`);
      setGreeting("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-900">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.15),transparent_40%),radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.15),transparent_40%)] pointer-events-none" />

      {/* Navigation Header */}
      <header className="relative border-b border-slate-800 bg-slate-900/55 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
              AI
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">LMS AI Study Assistant</h1>
              <p className="text-xs text-slate-400">Frontend Integration Layer</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isBackendOnline ? 'bg-emerald-400' : isBackendOnline === false ? 'bg-rose-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isBackendOnline ? 'bg-emerald-500' : isBackendOnline === false ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-xs font-medium text-slate-300">
              {isBackendOnline ? "Backend: Online" : isBackendOnline === false ? "Backend: Offline" : "Checking Backend..."}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        
        {/* Left Column - Form & Greet UI */}
        <section className="lg:col-span-7 space-y-6">
          <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
            
            <h2 className="text-xl font-semibold mb-6 flex items-center space-x-2 text-white">
              <span>ConnectRPC Demo</span>
              <span className="text-xs bg-slate-855 text-slate-400 px-2 py-0.5 rounded font-mono">Unary RPC</span>
            </h2>

            <form onSubmit={handleGreet} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="name-input" className="block text-sm font-medium text-slate-300">
                  Enter your name
                </label>
                <input
                  id="name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Antigravity"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="relative w-full h-12 flex items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 font-semibold text-white shadow-lg hover:from-cyan-400 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Calling GreetService...</span>
                  </div>
                ) : (
                  <span>Send GreetRequest</span>
                )}
              </button>
            </form>
          </div>

          {/* Greet Result Card */}
          {greeting && (
            <div className="p-8 rounded-2xl border border-emerald-950/40 bg-emerald-950/10 backdrop-blur-xl shadow-xl border-t-2 border-t-emerald-500 transition-all duration-300">
              <h3 className="text-xs uppercase font-semibold text-emerald-500 tracking-wider mb-2">Greeting Message</h3>
              <p className="text-2xl font-bold text-emerald-300 font-sans tracking-tight">
                {greeting}
              </p>
            </div>
          )}
        </section>

        {/* Right Column - Logs Console */}
        <section className="lg:col-span-5 space-y-4">
          <div className="border border-slate-800 rounded-2xl bg-slate-900/60 backdrop-blur-xl flex flex-col h-[400px]">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/30">
              <h3 className="font-semibold text-sm text-slate-200">Terminal Log Console</h3>
              <button 
                onClick={() => setLogs([])}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Clear
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-3 font-mono text-xs select-text">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-600">
                  Console is empty. Send a request to see output.
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
        <p>© 2026 LMS AI Study Assistant. Built with Next.js, ConnectRPC, and Tailwind CSS v4.</p>
      </footer>
    </div>
  );
}
