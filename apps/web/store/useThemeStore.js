import { create } from "zustand";

export const useThemeStore = create((set) => ({
  theme: "dark",

  initTheme: () => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("th-theme");
    const theme =
      saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },

  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("th-theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
    }
    set({ theme });
  },

  toggleTheme: () => {
    const current =
      (typeof window !== "undefined"
        ? document.documentElement.getAttribute("data-theme")
        : null) ?? "dark";
    const next = current === "dark" ? "light" : "dark";
    if (typeof window !== "undefined") {
      localStorage.setItem("th-theme", next);
      document.documentElement.setAttribute("data-theme", next);
    }
    set({ theme: next });
  },
}));
