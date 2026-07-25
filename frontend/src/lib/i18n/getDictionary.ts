import vi from '@/dictionaries/vi.json';
import en from '@/dictionaries/en.json';

const dictionaries = {
  vi,
  en,
};

export type Locale = keyof typeof dictionaries;
export type Dictionary = typeof vi;

export const DEFAULT_LOCALE: Locale = "vi";

export const getDictionary = (locale: string): Dictionary => {
  return dictionaries[locale as Locale] ?? dictionaries[DEFAULT_LOCALE];
};

/**
 * Detect locale from Accept-Language header or browser navigator string.
 * Checks for supported locales ('en', 'vi').
 * Falls back to DEFAULT_LOCALE ('vi').
 */
export const detectLocale = (acceptLanguageHeader?: string | null): Locale => {
  if (!acceptLanguageHeader) return DEFAULT_LOCALE;

  const header = acceptLanguageHeader.toLowerCase();

  // Split header languages
  const languages = header.split(",").map((lang) => {
    const [code] = lang.trim().split(";");
    return code.trim();
  });

  for (const lang of languages) {
    if (lang.startsWith("en")) return "en";
    if (lang.startsWith("vi")) return "vi";
  }

  return DEFAULT_LOCALE;
};
