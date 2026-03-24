import "server-only";

import { cookies } from "next/headers";
import {
  defaultTheme,
  isThemePreference,
  themeCookieName,
  type ThemePreference,
} from "@/lib/theme";

export async function getRequestTheme(): Promise<ThemePreference> {
  const cookieStore = await cookies();
  const theme = cookieStore.get(themeCookieName)?.value;

  if (isThemePreference(theme)) {
    return theme;
  }

  return defaultTheme;
}
