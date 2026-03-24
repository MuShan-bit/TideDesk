import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { getRequestMessages } from "@/lib/request-locale";
import { getRequestTheme } from "@/lib/request-theme";

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getRequestMessages();

  return {
    title: "TideDesk",
    description: messages.metadata.description,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale } = await getRequestMessages();
  const theme = await getRequestTheme();

  return (
    <html
      lang={locale}
      className={theme === "dark" ? "dark" : ""}
      style={{ colorScheme: theme }}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <AppShell locale={locale} theme={theme}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
