"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  translations,
  type Language,
} from "@/lib/translations";

interface LanguageContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  toggleLang: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  toggleLang: () => {},
  t: (key) => key,
});

const STORAGE_KEY = "tarombo-lang";

// useSyncExternalStore for reading localStorage without hydration mismatch.
// On the server, returns "en"; on the client, returns the saved value.
function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "id") return saved;
  } catch {
    // ignore
  }
  return "en";
}

function getServerSnapshot(): Language {
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // useSyncExternalStore handles SSR vs client hydration correctly
  const storedLang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [overrideLang, setOverrideLang] = useState<Language | null>(null);

  // The effective language: if user toggled during this session, use that;
  // otherwise use the stored value from localStorage.
  const lang = overrideLang ?? storedLang;

  const setLang = useCallback((l: Language) => {
    setOverrideLang(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
    // Dispatch a storage event so other tabs/components sync
    if (typeof window !== "undefined") {
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    }
    // Update <html lang="..."> for accessibility
    if (typeof document !== "undefined") {
      document.documentElement.lang = l === "id" ? "id" : "en";
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "en" ? "id" : "en");
  }, [lang, setLang]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const dict = translations[lang] ?? translations.en;
      let str = dict[key] ?? translations.en[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return str;
    },
    [lang]
  );

  // Update <html lang> when language changes
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang === "id" ? "id" : "en";
    }
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
