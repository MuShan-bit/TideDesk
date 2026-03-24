export const supportedThemes = ["light", "dark"] as const;

export type ThemePreference = (typeof supportedThemes)[number];

export const defaultTheme: ThemePreference = "light";
export const themeCookieName = "tidedesk.theme";

export function isThemePreference(
  value: string | null | undefined,
): value is ThemePreference {
  return supportedThemes.includes((value ?? "") as ThemePreference);
}
