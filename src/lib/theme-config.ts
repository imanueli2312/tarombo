// Theme color definitions for the Tarombo app
// Each theme defines the same set of CSS custom properties

export type AppTheme = "batak-toba" | "modern" | "hijau" | "gelap" | "emas";
export type TreeLayoutType = "vertical" | "horizontal" | "radial";

export interface ThemeColors {
  name: string;
  label: string;
  // Main colors
  primary: string;
  primaryLight: string;
  secondary: string;
  // Text
  text: string;
  textSecondary: string;
  // Backgrounds
  bgWarm: string;
  bgCream: string;
  bgCard: string;
  // Sidebar
  sidebar: string;
  sidebarText: string;
  // Accents
  accent: string;
  female: string;
  // Tree
  link: string;
  linkOpacity: string;
  highlight: string;
  // Export
  exportBg: string;
}

export const themes: Record<AppTheme, ThemeColors> = {
  "batak-toba": {
    name: "batak-toba",
    label: "Batak Toba",
    primary: "#7F1D1D",
    primaryLight: "#991B1B",
    secondary: "#DAA520",
    text: "#3E2723",
    textSecondary: "#795548",
    bgWarm: "#F5E6D3",
    bgCream: "#FDF6E3",
    bgCard: "#FFF8F0",
    sidebar: "#1C1410",
    sidebarText: "#DAA520",
    accent: "#B8860B",
    female: "#991B1B",
    link: "#D4A574",
    linkOpacity: "0.6",
    highlight: "#DAA520",
    exportBg: "#FDF6E3",
  },
  modern: {
    name: "modern",
    label: "Modern Minimal",
    primary: "#374151",
    primaryLight: "#4B5563",
    secondary: "#059669",
    text: "#111827",
    textSecondary: "#6B7280",
    bgWarm: "#F3F4F6",
    bgCream: "#FFFFFF",
    bgCard: "#FFFFFF",
    sidebar: "#111827",
    sidebarText: "#D1D5DB",
    accent: "#059669",
    female: "#DC2626",
    link: "#9CA3AF",
    linkOpacity: "0.5",
    highlight: "#059669",
    exportBg: "#F9FAFB",
  },
  hijau: {
    name: "hijau",
    label: "Hijau Nusantara",
    primary: "#14532D",
    primaryLight: "#166534",
    secondary: "#CA8A04",
    text: "#1C1917",
    textSecondary: "#57534E",
    bgWarm: "#F5F5F4",
    bgCream: "#FAFAF9",
    bgCard: "#FFFFFF",
    sidebar: "#1C1917",
    sidebarText: "#CA8A04",
    accent: "#A16207",
    female: "#BE123C",
    link: "#A8A29E",
    linkOpacity: "0.5",
    highlight: "#CA8A04",
    exportBg: "#FAFAF9",
  },
  gelap: {
    name: "gelap",
    label: "Gelap Elegan",
    primary: "#F87171",
    primaryLight: "#EF4444",
    secondary: "#FBBF24",
    text: "#F5F5F4",
    textSecondary: "#A8A29E",
    bgWarm: "#292524",
    bgCream: "#1C1917",
    bgCard: "#292524",
    sidebar: "#0C0A09",
    sidebarText: "#FBBF24",
    accent: "#F59E0B",
    female: "#FB7185",
    link: "#78716C",
    linkOpacity: "0.5",
    highlight: "#FBBF24",
    exportBg: "#1C1917",
  },
  emas: {
    name: "emas",
    label: "Emas Klasik",
    primary: "#1C1917",
    primaryLight: "#292524",
    secondary: "#D97706",
    text: "#292524",
    textSecondary: "#78716C",
    bgWarm: "#F5F5F4",
    bgCream: "#FFFBEB",
    bgCard: "#FFFBEB",
    sidebar: "#1C1917",
    sidebarText: "#D97706",
    accent: "#B45309",
    female: "#BE123C",
    link: "#D6D3D1",
    linkOpacity: "0.5",
    highlight: "#D97706",
    exportBg: "#FFFBEB",
  },
};

// Apply theme CSS variables to document root
export function applyThemeVars(theme: ThemeColors) {
  const root = document.documentElement;
  root.style.setProperty("--t-primary", theme.primary);
  root.style.setProperty("--t-primary-light", theme.primaryLight);
  root.style.setProperty("--t-secondary", theme.secondary);
  root.style.setProperty("--t-text", theme.text);
  root.style.setProperty("--t-text-sec", theme.textSecondary);
  root.style.setProperty("--t-bg-warm", theme.bgWarm);
  root.style.setProperty("--t-bg-cream", theme.bgCream);
  root.style.setProperty("--t-bg-card", theme.bgCard);
  root.style.setProperty("--t-sidebar", theme.sidebar);
  root.style.setProperty("--t-sidebar-text", theme.sidebarText);
  root.style.setProperty("--t-accent", theme.accent);
  root.style.setProperty("--t-female", theme.female);
  root.style.setProperty("--t-link", theme.link);
  root.style.setProperty("--t-link-opacity", theme.linkOpacity);
  root.style.setProperty("--t-highlight", theme.highlight);
  root.style.setProperty("--t-export-bg", theme.exportBg);
}

// Read a CSS variable value at runtime (for D3.js SVG rendering)
export function getCSSVar(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}