import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Database,
  LayoutDashboard,
  Link2,
  Orbit,
  ScrollText,
  SendHorizonal,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRequestMessages } from "@/lib/request-locale";

const metricIcons = [ShieldCheck, Database, Workflow, SendHorizonal];
const moduleIcons = [Link2, Workflow, Database];
const workspaceLinks = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    navKey: "dashboard" as const,
  },
  {
    href: "/bindings",
    icon: Link2,
    navKey: "bindings" as const,
  },
  {
    href: "/strategies",
    icon: Workflow,
    navKey: "strategies" as const,
  },
  {
    href: "/reports",
    icon: ScrollText,
    navKey: "reports" as const,
  },
  {
    href: "/ai",
    icon: Bot,
    navKey: "ai" as const,
  },
  {
    href: "/archives",
    icon: Orbit,
    navKey: "archives" as const,
  },
];

const stackItems = [
  "Next.js",
  "TypeScript",
  "ShadCN UI",
  "Tailwind CSS",
  "NestJS",
  "Prisma",
  "PostgreSQL",
  "NextAuth.js",
];

export default async function Home() {
  const { messages } = await getRequestMessages();
  const primaryLinkClassName =
    "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#145375,#0b6b88)] px-5 text-sm font-medium text-white shadow-[0_18px_34px_-24px_rgba(20,83,117,0.65)] transition hover:brightness-105";
  const secondaryLinkClassName =
    "inline-flex h-11 items-center justify-center rounded-full border border-border/70 bg-white/86 px-5 text-sm font-medium text-foreground transition hover:bg-[#edf6fb] dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={messages.home.eyebrow}
        title={messages.home.title}
        description={messages.home.description}
        badge={messages.home.badge}
        actions={
          <>
            <Link href="/dashboard" className={primaryLinkClassName}>
              {messages.home.actions.dashboard}
              <ArrowRight className="size-4" />
            </Link>
            <Link href="/bindings" className={secondaryLinkClassName}>
              {messages.home.actions.bindings}
            </Link>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {messages.home.metrics.map(({ value, label, description }, index) => {
          const Icon = metricIcons[index] ?? Sparkles;

          return (
            <Card
              key={label}
              size="sm"
              className="border-border/70 bg-white/90 dark:border-white/10 dark:bg-white/6"
            >
              <CardHeader className="gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d6e7f2] bg-[#edf6fb] text-[#145375] dark:border-white/10 dark:bg-white/8 dark:text-sky-200">
                    <Icon className="size-5" />
                  </div>
                  <span className="rounded-full bg-[#edf6fb] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#145375] dark:bg-white/8 dark:text-sky-200">
                    {value}
                  </span>
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-lg font-semibold">{label}</CardTitle>
                  <CardDescription className="leading-6">
                    {description}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <Card className="border-border/70 bg-white/92 dark:border-white/10 dark:bg-white/6">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full bg-[linear-gradient(135deg,#145375,#0b6b88)] px-3 text-white">
                {messages.home.progress.badge}
              </Badge>
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                TideDesk
              </span>
            </div>
            <div className="space-y-3">
              <CardTitle className="text-2xl font-semibold sm:text-[2rem]">
                {messages.home.progress.title}
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-7 sm:text-base">
                {messages.home.progress.description}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {messages.home.setupCards.map(({ title, description }, index) => {
              const Icon = moduleIcons[index] ?? Sparkles;

              return (
                <div
                  key={title}
                  className="grid gap-4 rounded-[1.5rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(244,248,253,0.86))] p-4 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] sm:grid-cols-[auto_1fr_auto] sm:items-center"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d6e7f2] bg-[#edf6fb] text-[#145375] dark:border-white/10 dark:bg-white/8 dark:text-sky-200">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-base font-semibold text-foreground">{title}</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>
                  </div>
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-white text-sm font-semibold text-[#145375] dark:border-white/10 dark:bg-white/8 dark:text-sky-200">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                </div>
              );
            })}
          </CardContent>

          <div className="border-t border-border/70 px-5 py-5 dark:border-white/10">
            <div className="grid gap-3 sm:grid-cols-3">
              {messages.home.progress.milestones.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.35rem] border border-border/70 bg-[#f5f9fd] px-4 py-4 text-sm leading-6 text-foreground dark:border-white/10 dark:bg-white/8"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="border-border/70 bg-white/92 dark:border-white/10 dark:bg-white/6">
            <CardHeader className="space-y-3">
              <Badge className="w-fit rounded-full bg-[#edf6fb] text-[#145375] dark:bg-white/8 dark:text-sky-200">
                {messages.home.nextStep.title}
              </Badge>
              <CardTitle className="text-2xl font-semibold">
                {messages.home.nextStep.title}
              </CardTitle>
              <CardDescription className="text-sm leading-7">
                {messages.home.nextStep.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.5rem] border border-border/70 bg-[#f5f9fd] p-4 text-sm leading-7 text-foreground dark:border-white/10 dark:bg-white/8">
                {messages.home.nextStep.action}
              </div>
              <div className="flex flex-wrap gap-2">
                {stackItems.map((item) => (
                  <Badge
                    key={item}
                    className="rounded-full border border-border/70 bg-white px-3 text-foreground hover:bg-white dark:border-white/10 dark:bg-white/8 dark:text-white"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-white/92 dark:border-white/10 dark:bg-white/6">
            <CardHeader className="space-y-3">
              <CardTitle className="text-2xl font-semibold">
                {messages.shell.controlCenter}
              </CardTitle>
              <CardDescription className="text-sm leading-7">
                {messages.shell.subtitle}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {workspaceLinks.map(({ href, icon: Icon, navKey }) => (
                <Link
                  key={href}
                  href={href}
                  className="group rounded-[1.4rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,248,253,0.88))] p-4 transition hover:border-[#c7ddee] hover:shadow-[0_18px_30px_-28px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] dark:hover:bg-white/10"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#d6e7f2] bg-[#edf6fb] text-[#145375] dark:border-white/10 dark:bg-white/8 dark:text-sky-200">
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {messages.shell.nav[navKey]}
                      </p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {messages.shell.navDescriptions[navKey]}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
