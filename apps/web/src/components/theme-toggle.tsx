"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getMessages, type Locale } from "@/lib/i18n";
import { themeCookieName, type ThemePreference } from "@/lib/theme";

type ThemeToggleProps = {
  locale: Locale;
  theme: ThemePreference;
};

function persistTheme(nextTheme: ThemePreference) {
  document.cookie = `${themeCookieName}=${nextTheme}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  document.documentElement.classList.toggle("dark", nextTheme === "dark");
  document.documentElement.style.colorScheme = nextTheme;
}

export function ThemeToggle({ locale, theme }: ThemeToggleProps) {
  const messages = getMessages(locale);
  const [currentTheme, setCurrentTheme] = useState(theme);

  useEffect(() => {
    setCurrentTheme(theme);
  }, [theme]);

  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  const label =
    nextTheme === "dark" ? messages.shell.themeDark : messages.shell.themeLight;

  return (
    <Button
      type="button"
      variant="outline"
      className="h-10 rounded-full border-border/70 bg-white/78 px-3 text-foreground shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)] hover:bg-sky-50 dark:border-white/10 dark:bg-white/6 dark:hover:bg-white/12"
      aria-label={`${messages.shell.themeLabel}：${label}`}
      onClick={() => {
        setCurrentTheme(nextTheme);
        persistTheme(nextTheme);
      }}
    >
      {nextTheme === "dark" ? (
        <MoonStar className="size-4" />
      ) : (
        <SunMedium className="size-4" />
      )}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
