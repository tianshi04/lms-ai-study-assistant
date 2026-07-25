import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { TranslationProvider } from "@/lib/i18n/TranslationProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { getDictionary, detectLocale, Locale } from "@/lib/i18n/getDictionary";

import { cookies, headers } from "next/headers";

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
  description: "Coursera-style Online Learning Platform integrated with Coursera AI Coach",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value as Locale | undefined;

  let locale: Locale;
  if (cookieLocale && (cookieLocale === "en" || cookieLocale === "vi")) {
    locale = cookieLocale;
  } else {
    const headerList = await headers();
    const acceptLanguage = headerList.get("accept-language");
    locale = detectLocale(acceptLanguage);
  }

  const dictionary = getDictionary(locale);
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white transition-colors duration-200">
        <QueryProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <TranslationProvider initialLocale={locale} initialDictionary={dictionary}>
              <ToastProvider>
                {children}
              </ToastProvider>
            </TranslationProvider>

          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
