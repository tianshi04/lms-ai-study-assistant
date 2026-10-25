import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import "katex/dist/katex.min.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { CopilotProvider } from "@/components/providers/CopilotProvider";
import { OpenObserveProvider } from "@/components/providers/OpenObserveProvider";
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

export const viewport: Viewport = {
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  title: {
    template: "%s | LMS AI Platform",
    default: "LMS AI Platform - Nền tảng học trực tuyến thông minh",
  },
  description: "Nền tảng học tập trực tuyến thông minh tích hợp trợ lý AI học tập cá nhân hóa.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
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

  const openObserveConfig = {
    clientToken: (process.env.OPENOBSERVE_CLIENT_TOKEN || "").trim(),
    applicationId: (process.env.OPENOBSERVE_APPLICATION_ID || "lms-frontend").trim(),
    site: (process.env.OPENOBSERVE_SITE || "").trim(),
    organizationIdentifier: (process.env.OPENOBSERVE_ORG || "default").trim(),
    service: "lms-frontend",
    env: process.env.NODE_ENV || "production",
    version: "1.0.0",
  };

  return (
    <AuthProvider initialAuth={initialAuth}>
      <OpenObserveProvider config={openObserveConfig}>{children}</OpenObserveProvider>
    </AuthProvider>
  );
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
        <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />
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
      </body>
    </html>
  );
}
