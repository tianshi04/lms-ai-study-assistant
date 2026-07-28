import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ToastProvider } from "@/components/ui/Toast";

import { cookies } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Coursera LMS Platform",
  description: "Coursera-style Online Learning Platform",
};

import { AuthProvider } from "@/components/providers/AuthProvider";
import { CopilotProvider } from "@/components/providers/CopilotProvider";
import { MainLayout } from "@/components/layout/MainLayout";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();

  const rawUserName = cookieStore.get("user_name")?.value;
  const rawUserEmail = cookieStore.get("user_email")?.value;
  const userRole = cookieStore.get("user_role")?.value || null;

  const initialAuth = {
    userName: rawUserName ? decodeURIComponent(rawUserName) : null,
    userEmail: rawUserEmail ? decodeURIComponent(rawUserEmail) : null,
    userRole: userRole,
  };

  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white transition-colors duration-200">
        <QueryProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <AuthProvider initialAuth={initialAuth}>
              <CopilotProvider>
                <ToastProvider>
                  <MainLayout>
                    {children}
                  </MainLayout>
                </ToastProvider>
              </CopilotProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

