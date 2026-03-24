import { Suspense } from "react";
import {
  KeyRound,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  ScrollText,
  Sparkles,
  Workflow,
} from "lucide-react";
import { LoginForm } from "./login-form";
import { LoadingState } from "@/components/loading-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRequestMessages } from "@/lib/request-locale";

const previewIcons = [Link2, Workflow, ScrollText];
const workspaceTabs = [LayoutDashboard, Link2, Workflow, ScrollText];

export default async function LoginPage() {
  const { locale, messages } = await getRequestMessages();

  return (
    <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
      <section className="space-y-6">
        <div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.18)] backdrop-blur dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_60px_-38px_rgba(0,0,0,0.55)] sm:p-8">
          <Badge className="rounded-full bg-[linear-gradient(135deg,#145375,#0b6b88)] px-3 text-white">
            {messages.login.heroBadge}
          </Badge>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {messages.login.heroTitle}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            {messages.login.heroDescription}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {[0, 1, 2, 3].map((index) => {
              const Icon = workspaceTabs[index] ?? Sparkles;
              const labels = [
                messages.shell.nav.dashboard,
                messages.shell.nav.bindings,
                messages.shell.nav.strategies,
                messages.shell.nav.reports,
              ];

              return (
                <div
                  key={labels[index]}
                  className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-[#f5f9fd] px-3 py-2 text-sm text-foreground dark:border-white/10 dark:bg-white/8"
                >
                  <Icon className="size-4 text-[#145375] dark:text-sky-200" />
                  {labels[index]}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <Card className="border-border/70 bg-white/92 dark:border-white/10 dark:bg-white/6">
            <CardHeader className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d6e7f2] bg-[#edf6fb] text-[#145375] dark:border-white/10 dark:bg-white/8 dark:text-sky-200">
                <KeyRound className="size-5" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-xl font-semibold">
                  {messages.login.accountTitle}
                </CardTitle>
                <CardDescription className="leading-6">
                  {messages.login.accountHint}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-[1.35rem] border border-border/70 bg-[#f5f9fd] px-4 py-4 text-sm text-foreground dark:border-white/10 dark:bg-white/8">
                {messages.login.accountEmail}
              </div>
              <div className="rounded-[1.35rem] border border-border/70 bg-[#f5f9fd] px-4 py-4 text-sm text-foreground dark:border-white/10 dark:bg-white/8">
                {messages.login.accountPassword}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-white/92 dark:border-white/10 dark:bg-white/6">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d6e7f2] bg-[#edf6fb] text-[#145375] dark:border-white/10 dark:bg-white/8 dark:text-sky-200">
                  <LockKeyhole className="size-5" />
                </div>
                <Badge className="rounded-full bg-[#edf6fb] text-[#145375] dark:bg-white/8 dark:text-sky-200">
                  auto-x-to-wechat
                </Badge>
              </div>
              <div className="space-y-2">
                <CardTitle className="text-xl font-semibold">
                  {messages.home.progress.title}
                </CardTitle>
                <CardDescription className="leading-6">
                  {messages.home.progress.description}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {messages.home.setupCards.map(({ title, description }, index) => {
                const Icon = previewIcons[index] ?? Sparkles;

                return (
                  <div
                    key={title}
                    className="grid gap-3 rounded-[1.35rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,248,253,0.88))] p-4 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] sm:grid-cols-[auto_1fr]"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d6e7f2] bg-[#edf6fb] text-[#145375] dark:border-white/10 dark:bg-white/8 dark:text-sky-200">
                      <Icon className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="space-y-4">
        <div className="rounded-[1.5rem] border border-white/70 bg-white/82 px-4 py-4 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.22)] backdrop-blur dark:border-white/10 dark:bg-white/6 dark:shadow-[0_20px_50px_-38px_rgba(0,0,0,0.55)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#145375] dark:text-sky-200">
            {messages.shell.workspaceLabel}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {messages.shell.subtitle}
          </p>
        </div>

        <Suspense
          fallback={
            <LoadingState
              title={messages.login.loadingTitle}
              description={messages.login.loadingDescription}
            />
          }
        >
          <LoginForm locale={locale} />
        </Suspense>
      </div>
    </div>
  );
}
