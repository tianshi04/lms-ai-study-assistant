import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import "katex/dist/katex.min.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { CopilotProvider } from "@/components/providers/CopilotProvider";
import { MainLayout } from "@/components/layout/MainLayout";
import { getAuthServer } from "@/lib/auth_server";
import { Analytics } from "@vercel/analytics/react";

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

async function AsyncAuthProvider({ children }: { children: React.ReactNode }) {
  const session = await getAuthServer();

  const initialAuth = {
    userId: session.userId,
    userName: session.userName,
    userEmail: session.userEmail,
    userRole: session.userRole,
    userAvatar: session.userAvatar,
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
      <head>
        <script src="https://accounts.google.com/gsi/client" async defer />
      </head>
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
        <Analytics />
      </body>
    </html>
  );
}
