"use client";

import React, { createContext, useContext, useState } from "react";
import { Dictionary, Locale, getDictionary } from "./getDictionary";
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

  // Simple nested key accessor, e.g. t('navbar.catalog')
  const t = (path: string): string => {
    const keys = path.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = dictionary;
    for (const key of keys) {
      if (current === undefined) return path;
      current = current[key];
    }
    return current as unknown as string ?? path;
  };

  return { t, locale, setLocale };
}
