"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { getMessages, type Locale } from "@/lib/i18n";
import { type ThemePreference } from "@/lib/theme";

type ShellHeaderProps = {
  locale: Locale;
  theme: ThemePreference;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ShellHeader({ locale, theme }: ShellHeaderProps) {
  const pathname = usePathname();
  const messages = getMessages(locale);
  const navigation = [
    { href: "/", label: messages.shell.nav.overview },
    { href: "/dashboard", label: messages.shell.nav.dashboard },
    { href: "/bindings", label: messages.shell.nav.bindings },
    { href: "/strategies", label: messages.shell.nav.strategies },
    { href: "/archives", label: messages.shell.nav.archives },
    { href: "/runs", label: messages.shell.nav.runs },
  ];

  return (
    <header className="sticky top-4 z-20 mb-8 rounded-[2rem] border border-border/70 bg-white/78 px-5 py-4 shadow-[0_18px_60px_-32px_rgba(87,62,22,0.35)] backdrop-blur dark:border-white/10 dark:bg-white/6 dark:shadow-[0_18px_60px_-32px_rgba(0,0,0,0.5)]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2d4d3f] text-sm font-semibold tracking-[0.2em] text-white shadow-[0_12px_30px_-18px_rgba(45,77,63,0.9)]">
              XW
            </div>
            <div className="min-w-0">
              <Link
                href="/"
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                auto-x-to-wechat
              </Link>
              <p className="truncate text-sm text-muted-foreground">
                {messages.shell.subtitle}
              </p>
            </div>
            <Badge className="hidden rounded-full bg-[#f5efe4] text-[#7f5a26] sm:inline-flex dark:bg-[#3d3124] dark:text-[#f2c58c]">
              {messages.shell.badge}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <LocaleSwitcher locale={locale} />
            <ThemeToggle locale={locale} theme={theme} />
          </div>
        </div>

        <nav className="flex flex-wrap gap-2 rounded-[1.5rem] border border-border/60 bg-[#f7f2e8]/70 p-1.5 dark:border-white/8 dark:bg-white/5">
          {navigation.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors",
                  active
                    ? "bg-[#2d4d3f] text-white shadow-[0_10px_24px_-16px_rgba(45,77,63,0.9)] dark:bg-[#d8e2db] dark:text-[#18201b]"
                    : "text-foreground hover:bg-white/70 dark:hover:bg-white/10",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
