"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { getMessages, localeCookieName, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LocaleSwitcherProps = {
  locale: Locale;
};

export function LocaleSwitcher({ locale }: LocaleSwitcherProps) {
  const router = useRouter();
  const messages = getMessages(locale);
  const [currentLocale, setCurrentLocale] = useState(locale);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCurrentLocale(locale);
  }, [locale]);

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-white/78 p-1 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-white/6">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#edf3fb] text-[#145375] dark:bg-[#123347] dark:text-sky-200">
        <Languages className="size-4" />
      </span>
      {(["zh-CN", "en"] as const).map((nextLocale) => {
        const active = nextLocale === currentLocale;

        return (
          <Button
            key={nextLocale}
            type="button"
            size="sm"
            variant={active ? "secondary" : "ghost"}
            className={cn(
              "rounded-full px-3",
              active
                ? "bg-[linear-gradient(135deg,#145375,#0b6b88)] text-white hover:brightness-105 dark:text-white"
                : "text-foreground hover:bg-sky-50 dark:hover:bg-white/10",
            )}
            aria-label={`${messages.shell.localeLabel}：${messages.shell.localeOptions[nextLocale]}`}
            disabled={isPending || active}
            onClick={() => {
              document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
              setCurrentLocale(nextLocale);
              startTransition(() => {
                router.refresh();
              });
            }}
          >
            {messages.shell.localeOptions[nextLocale]}
          </Button>
        );
      })}
    </div>
  );
}
