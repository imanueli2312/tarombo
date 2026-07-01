"use client";

import { useAppStore } from "@/store/app-store";
import { themes, type AppTheme } from "@/lib/theme-config";
import { Palette } from "lucide-react";

const themeList: { key: AppTheme; label: string; preview: string[] }[] = [
  { key: "batak-toba", label: "Batak Toba", preview: ["#7F1D1D", "#DAA520", "#FFF8F0"] },
  { key: "modern", label: "Modern", preview: ["#374151", "#059669", "#FFFFFF"] },
  { key: "hijau", label: "Hijau", preview: ["#14532D", "#CA8A04", "#FAFAF9"] },
  { key: "emas", label: "Emas", preview: ["#1C1917", "#D97706", "#FFFBEB"] },
  { key: "gelap", label: "Gelap", preview: ["#292524", "#FBBF24", "#1C1917"] },
];

export function ThemeSelector() {
  const appTheme = useAppStore((s) => s.appTheme);
  const setAppTheme = useAppStore((s) => s.setAppTheme);

  return (
    <div className="relative group">
      <button
        className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-[var(--t-secondary)]/10 transition-colors text-[var(--t-sidebar-text)]"
        title="Pilih Tema"
      >
        <Palette className="h-4 w-4" />
      </button>
      <div className="absolute bottom-full left-0 mb-2 w-52 rounded-lg border border-[var(--t-border)]/30 bg-[var(--t-sidebar)] p-2 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <p className="text-[10px] uppercase tracking-wider text-[var(--t-sidebar-text)]/50 px-2 pb-1.5">Tema Aplikasi</p>
        <div className="space-y-1">
          {themeList.map((t) => {
            const isActive = appTheme === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setAppTheme(t.key)}
                className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-[var(--t-secondary)]/20 text-[var(--t-sidebar-text)]"
                    : "text-[var(--t-sidebar-text)]/60 hover:bg-[var(--t-secondary)]/10 hover:text-[var(--t-sidebar-text)]"
                }`}
              >
                <div className="flex gap-0.5 flex-shrink-0">
                  {t.preview.map((c, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-sm border border-white/10"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium">{t.label}</span>
                {isActive && <span className="ml-auto text-[10px]">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}