"use client";

import { useEffect } from "react";
import { useThemeStore } from "../store/useThemeStore";

export default function ThemeProvider({ children }) {
  const { initTheme } = useThemeStore();
  useEffect(() => { initTheme(); }, [initTheme]);
  return children;
}
