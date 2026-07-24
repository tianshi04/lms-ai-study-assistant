import vi from '@/dictionaries/vi.json';
import en from '@/dictionaries/en.json';

const dictionaries = {
  vi,
  en,
};

export type Locale = keyof typeof dictionaries;
export type Dictionary = typeof vi;

export const getDictionary = (locale: string): Dictionary => {
  return dictionaries[locale as Locale] ?? dictionaries.vi;
};
