"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Dictionary, Locale, getDictionary, detectLocale } from "./getDictionary";
import { useRouter } from "next/navigation";

interface TranslationContextType {
  locale: Locale;
  dictionary: Dictionary;
  setLocale: (newLocale: Locale) => void;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({
  children,
  initialLocale,
  initialDictionary,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  initialDictionary: Dictionary;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [dictionary, setDictionary] = useState<Dictionary>(initialDictionary);
  const router = useRouter();

  const setLocale = (newLocale: Locale) => {
    // Set cookie that lasts for 365 days
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
    setLocaleState(newLocale);
    setDictionary(getDictionary(newLocale));
    
    // Refresh the router to update any Server Components
    router.refresh();
  };

  useEffect(() => {
    // If user hasn't explicitly set NEXT_LOCALE cookie, detect from client browser language
    const hasCookie = document.cookie.split("; ").some((c) => c.startsWith("NEXT_LOCALE="));
    if (!hasCookie && typeof navigator !== "undefined") {
      const clientLocale = detectLocale(navigator.language);
      if (clientLocale !== initialLocale) {
        queueMicrotask(() => {
          setLocale(clientLocale);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TranslationContext.Provider value={{ locale, dictionary, setLocale }}>
      {children}
    </TranslationContext.Provider>
  );
}

// Helper hook to use translations
export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }

  const { dictionary, locale, setLocale } = context;

  // Simple nested key accessor, e.g. t('navbar.catalog', 'Default Text')
  const t = (path: string, fallback?: string): string => {
    const keys = path.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = dictionary;
    for (const key of keys) {
      if (current === undefined) return fallback !== undefined ? fallback : path;
      current = current[key];
    }
    if (typeof current === "string" && current.length > 0) {
      return current;
    }
    return fallback !== undefined ? fallback : path;
  };

  return { t, locale, setLocale };
}
