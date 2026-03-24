import type { ReactNode } from "react";
import { auth } from "@/auth";
import { ShellHeader } from "@/components/shell-header";
import { type Locale } from "@/lib/i18n";
import { type ThemePreference } from "@/lib/theme";

type AppShellProps = {
  children: ReactNode;
  locale: Locale;
  theme: ThemePreference;
};

export async function AppShell({ children, locale, theme }: AppShellProps) {
  const session = await auth();

  return (
    <ShellHeader
      locale={locale}
      theme={theme}
      user={
        session?.user
          ? {
              email: session.user.email ?? null,
              name: session.user.name ?? null,
              role: session.user.role ?? null,
            }
          : null
      }
    >
      {children}
    </ShellHeader>
  );
}
