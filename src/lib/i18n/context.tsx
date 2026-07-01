"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { translations, type Locale } from "./translations";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  locales: { value: Locale; label: string }[];
}

const I18nContext = createContext<I18nContextType | null>(null);

const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: "id", label: "Indonesia" },
  { value: "en", label: "English" },
  { value: "bbc", label: "Batak" },
];

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("id");

  const t = useCallback(
    (key: string): string => {
      return translations[locale][key] || translations["id"][key] || key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, locales: LOCALE_OPTIONS }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}