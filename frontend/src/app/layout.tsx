import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { CopilotProvider } from "@/components/providers/CopilotProvider";
import { MainLayout } from "@/components/layout/MainLayout";
import { getAuthServer } from "@/lib/auth_server";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  weight: ["300", "400", "500", "600", "700", "800"],
  subsets: ["vietnamese", "latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["vietnamese", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Coursera LMS Platform",
  description: "Coursera-style Online Learning Platform",
};

// Documented Block: RootLayout allows dynamic authentication and params resolution across client subtrees.
export const instant = false;

async function AsyncAuthProvider({ children }: { children: React.ReactNode }) {
  const session = await getAuthServer();

  const initialAuth = {
    userId: session.userId,
    userName: session.userName,
    userEmail: session.userEmail,
    userRole: session.userRole,
  };

  return <AuthProvider initialAuth={initialAuth}>{children}</AuthProvider>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${beVietnamPro.variable} ${jetbrainsMono.variable} font-sans antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ToastProvider>
              <Suspense fallback={<AuthProvider>{children}</AuthProvider>}>
                <AsyncAuthProvider>
                  <CopilotProvider>
                    <MainLayout>{children}</MainLayout>
                  </CopilotProvider>
                </AsyncAuthProvider>
              </Suspense>
            </ToastProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
