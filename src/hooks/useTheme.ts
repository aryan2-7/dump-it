import { useCallback, useEffect, useState } from "react";
import { isThemeId, THEME_STORAGE_KEY, type ThemeId } from "../theme";

function loadTheme(): ThemeId {
  const raw = localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeId(raw) ? raw : "default";
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(loadTheme);

  useEffect(() => {
    if (theme === "default") {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  }, []);

  return { theme, setTheme };
}
