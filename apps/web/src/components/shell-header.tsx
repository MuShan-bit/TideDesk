"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  Bot,
  ChevronRight,
  House,
  LayoutDashboard,
  Link2,
  LogIn,
  Orbit,
  ScrollText,
  SendHorizonal,
  Tags,
  Workflow,
} from "lucide-react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getMessages, type Locale } from "@/lib/i18n";
import { type ThemePreference } from "@/lib/theme";

type ShellHeaderProps = {
  children: ReactNode;
  locale: Locale;
  theme: ThemePreference;
  user: {
    email: string | null;
    name: string | null;
    role: string | null;
  } | null;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getDisplayInitial(value: string | null | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    return "AX";
  }

  return normalized.slice(0, 2).toUpperCase();
}

export function ShellHeader({
  children,
  locale,
  theme,
  user,
}: ShellHeaderProps) {
  const pathname = usePathname();
  const messages = getMessages(locale);
  const navigation = [
    {
      description: messages.shell.navDescriptions.overview,
      href: "/",
      icon: House,
      label: messages.shell.nav.overview,
    },
    {
      description: messages.shell.navDescriptions.dashboard,
      href: "/dashboard",
      icon: LayoutDashboard,
      label: messages.shell.nav.dashboard,
    },
    {
      description: messages.shell.navDescriptions.bindings,
      href: "/bindings",
      icon: Link2,
      label: messages.shell.nav.bindings,
    },
    {
      description: messages.shell.navDescriptions.strategies,
      href: "/strategies",
      icon: Workflow,
      label: messages.shell.nav.strategies,
    },
    {
      description: messages.shell.navDescriptions.reports,
      href: "/reports",
      icon: ScrollText,
      label: messages.shell.nav.reports,
    },
    {
      description: messages.shell.navDescriptions.publishing,
      href: "/publishing",
      icon: SendHorizonal,
      label: messages.shell.nav.publishing,
    },
    {
      description: messages.shell.navDescriptions.ai,
      href: "/ai",
      icon: Bot,
      label: messages.shell.nav.ai,
    },
    {
      description: messages.shell.navDescriptions.taxonomy,
      href: "/taxonomy",
      icon: Tags,
      label: messages.shell.nav.taxonomy,
    },
    {
      description: messages.shell.navDescriptions.archives,
      href: "/archives",
      icon: Archive,
      label: messages.shell.nav.archives,
    },
    {
      description: messages.shell.navDescriptions.runs,
      href: "/runs",
      icon: Orbit,
      label: messages.shell.nav.runs,
    },
  ];
  const isPublicRoute = pathname === "/" || pathname === "/login";
  const activeNavItem = navigation.find((item) =>
    isActivePath(pathname, item.href),
  );
  const currentTitle =
    pathname === "/login"
      ? messages.login.formTitle
      : activeNavItem?.label ?? messages.shell.nav.overview;
  const currentDescription =
    pathname === "/login"
      ? messages.login.heroDescription
      : activeNavItem?.description ?? messages.shell.subtitle;

  if (isPublicRoute) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(20,83,117,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_28%),linear-gradient(180deg,#eef4fb_0%,#f7faff_32%,#ffffff_100%)] text-foreground transition-colors dark:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(30,64,175,0.18),transparent_24%),linear-gradient(180deg,#07101d_0%,#0b1424_36%,#0a1120_100%)]">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] border border-white/60 bg-white/82 px-5 py-4 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.25)] backdrop-blur dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_60px_-38px_rgba(0,0,0,0.55)]">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#145375,#0b6b88)] text-sm font-semibold tracking-[0.26em] text-white shadow-[0_18px_32px_-20px_rgba(20,83,117,0.9)]">
                AX
              </div>
              <div className="min-w-0">
                <Link
                  href="/"
                  className="block truncate text-lg font-semibold tracking-tight text-foreground"
                >
                  auto-x-to-wechat
                </Link>
                <p className="truncate text-sm text-muted-foreground">
                  {messages.shell.subtitle}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#145375,#0b6b88)] px-4 text-sm font-medium text-white transition hover:brightness-105"
                >
                  {messages.shell.nav.dashboard}
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border/70 bg-white px-4 text-sm font-medium text-foreground transition hover:bg-sky-50 dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
                >
                  <LogIn className="size-4" />
                  {messages.login.submit}
                </Link>
              )}
              <LocaleSwitcher locale={locale} />
              <ThemeToggle locale={locale} theme={theme} />
            </div>
          </header>
          <main className="flex-1 pb-10">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(20,83,117,0.12),transparent_28%),linear-gradient(180deg,#eef4fb_0%,#f6f9fd_34%,#f8fbff_100%)] text-foreground transition-colors dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.1),transparent_24%),linear-gradient(180deg,#07101d_0%,#0b1424_36%,#0a1120_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="hidden lg:block lg:w-72 lg:shrink-0">
          <div className="sticky top-4 flex h-[calc(100vh-2rem)] flex-col rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,251,255,0.92))] p-4 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.22)] backdrop-blur dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(10,17,32,0.96),rgba(13,23,38,0.94))] dark:shadow-[0_28px_80px_-42px_rgba(0,0,0,0.55)]">
            <div className="flex items-center gap-3 rounded-[1.5rem] border border-border/70 bg-white/70 px-4 py-4 dark:border-white/10 dark:bg-white/6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#145375,#0b6b88)] text-sm font-semibold tracking-[0.26em] text-white shadow-[0_18px_32px_-20px_rgba(20,83,117,0.9)]">
                AX
              </div>
              <div className="min-w-0">
                <Link
                  href="/dashboard"
                  className="block truncate text-base font-semibold tracking-tight text-foreground"
                >
                  auto-x-to-wechat
                </Link>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {messages.shell.controlCenter}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-[1.5rem] border border-transparent bg-[linear-gradient(135deg,rgba(20,83,117,0.12),rgba(14,165,233,0.08))] p-4 dark:bg-[linear-gradient(135deg,rgba(20,83,117,0.22),rgba(14,165,233,0.08))]">
              <Badge className="rounded-full bg-[rgba(20,83,117,0.12)] text-[#145375] dark:bg-[rgba(125,211,252,0.1)] dark:text-sky-200">
                {messages.shell.badge}
              </Badge>
              <p className="mt-3 text-sm leading-6 text-foreground">
                {messages.shell.subtitle}
              </p>
            </div>

            <nav className="mt-5 flex-1 space-y-1 overflow-y-auto pr-1">
              {navigation.map((item) => {
                const active = isActivePath(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center justify-between rounded-[1.25rem] px-3 py-3 transition-all",
                      active
                        ? "bg-[linear-gradient(135deg,#145375,#0b6b88)] text-white shadow-[0_18px_34px_-22px_rgba(20,83,117,0.85)]"
                        : "text-foreground hover:bg-white/75 hover:shadow-[0_14px_26px_-24px_rgba(15,23,42,0.35)] dark:hover:bg-white/8",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm transition-colors",
                          active
                            ? "border-white/12 bg-white/12 text-white"
                            : "border-border/70 bg-white/70 text-[#145375] dark:border-white/10 dark:bg-white/8 dark:text-sky-200",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {item.label}
                        </span>
                        <span
                          className={cn(
                            "block truncate text-xs",
                            active ? "text-white/70" : "text-muted-foreground",
                          )}
                        >
                          {item.description}
                        </span>
                      </span>
                    </span>
                    <ChevronRight
                      className={cn(
                        "size-4 shrink-0 transition-transform",
                        active
                          ? "translate-x-0 text-white/70"
                          : "text-muted-foreground group-hover:translate-x-0.5",
                      )}
                    />
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 rounded-[1.5rem] border border-border/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#145375,#0b6b88)] text-sm font-semibold text-white">
                  {getDisplayInitial(user?.name ?? user?.email)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {user?.name ?? messages.shell.fallbackUserName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user?.email ?? messages.shell.signedInLabel}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-4 z-20 mb-6 rounded-[1.75rem] border border-white/70 bg-white/82 px-5 py-4 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.22)] backdrop-blur dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_60px_-38px_rgba(0,0,0,0.55)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#145375] dark:text-sky-200">
                  <span>{messages.shell.workspaceLabel}</span>
                  <span className="h-1 w-1 rounded-full bg-current/40" />
                  <span>{currentTitle}</span>
                </div>
                <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {currentTitle}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {currentDescription}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="hidden rounded-full border border-border/70 bg-[#edf6fb] px-3 py-2 text-xs font-medium text-[#145375] dark:border-white/10 dark:bg-white/8 dark:text-sky-200 sm:inline-flex">
                  {user?.role ?? messages.shell.defaultRole}
                </div>
                <LocaleSwitcher locale={locale} />
                <ThemeToggle locale={locale} theme={theme} />
              </div>
            </div>

            <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {navigation.map((item) => {
                const active = isActivePath(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition",
                      active
                        ? "border-transparent bg-[linear-gradient(135deg,#145375,#0b6b88)] text-white"
                        : "border-border/70 bg-white/70 text-foreground dark:border-white/10 dark:bg-white/8",
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          <main className="pb-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
