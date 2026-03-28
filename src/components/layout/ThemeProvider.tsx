"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

// These override Tailwind v4's @layer theme variables via inline style (highest priority)
const DARK_VARS: Record<string, string> = {
  // Custom theme surface tokens (used by body background in globals.css)
  "--color-surface":         "#1e293b",
  "--color-surface-raised":  "#0f172a",
  "--color-surface-overlay": "#1e293b",

  // Neutrals — backgrounds & text
  "--color-white":       "#1e293b",
  "--color-slate-50":    "#0f172a",
  "--color-slate-100":   "#1e293b",
  "--color-slate-200":   "#334155",
  "--color-slate-300":   "#475569",
  "--color-slate-400":   "#94a3b8",
  "--color-slate-500":   "#94a3b8",
  "--color-slate-600":   "#cbd5e1",
  "--color-slate-700":   "#e2e8f0",
  "--color-slate-800":   "#f1f5f9",
  "--color-slate-900":   "#f8fafc",

  // Violet (Redeemer) — soft backgrounds + text flipped to light
  "--color-violet-50":   "#1a1033",
  "--color-violet-100":  "#2d1f4a",
  "--color-violet-200":  "#3d2963",   // border → dark
  "--color-violet-600":  "#a78bfa",   // text → light purple
  "--color-violet-700":  "#c4b5fd",   // text → even lighter

  // Emerald (Trinity) — soft backgrounds + text flipped to light
  "--color-emerald-50":  "#0c2318",
  "--color-emerald-100": "#143825",
  "--color-emerald-200": "#1a4a35",   // border → dark
  "--color-emerald-600": "#34d399",   // text → light green
  "--color-emerald-700": "#6ee7b7",   // text → even lighter

  // Amber (open/unassigned status) — text must be bright on dark bg
  "--color-amber-50":    "#271d0a",
  "--color-amber-100":   "#3a2a0e",
  "--color-amber-200":   "#4d390f",   // border → dark
  "--color-amber-600":   "#fbbf24",   // text → bright amber
  "--color-amber-700":   "#fde68a",   // text → bright yellow-amber

  // Red (cancelled status)
  "--color-red-50":      "#2a0f0f",
  "--color-red-100":     "#3d1515",
  "--color-red-200":     "#5a1e1e",   // border → dark
  "--color-red-400":     "#fca5a5",   // text → light red
  "--color-red-500":     "#f87171",
  "--color-red-600":     "#fca5a5",   // text → light red

  // Green
  "--color-green-50":    "#0d2318",
  "--color-green-700":   "#34d399",   // text → light green

  // Brand blue (confirmed status, badges, buttons)
  "--color-brand-50":    "#0f1f3d",
  "--color-brand-100":   "#172d56",
  "--color-brand-200":   "#1e3a6e",   // border → dark
  "--color-brand-400":   "#93c5fd",   // light blue
  "--color-brand-700":   "#93c5fd",   // text → light blue (was dark #1d4ed8)
};

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.style.setProperty("color-scheme", "dark");
    root.style.setProperty("background-color", "#0f172a");
    root.style.setProperty("color", "#f1f5f9");
    Object.entries(DARK_VARS).forEach(([k, v]) => root.style.setProperty(k, v));
    document.body.style.setProperty("background-color", "#0f172a");
  } else {
    root.classList.remove("dark");
    root.style.removeProperty("color-scheme");
    root.style.removeProperty("background-color");
    root.style.removeProperty("color");
    Object.keys(DARK_VARS).forEach(k => root.style.removeProperty(k));
    document.body.style.removeProperty("background-color");
  }
}

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const initial = stored ?? preferred;
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function toggle() {
    setTheme(prev => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("theme", next);
      applyTheme(next);
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
