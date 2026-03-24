import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  badge?: string;
  actions?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  badge,
  actions,
}: PageHeaderProps) {
  return (
    <section className="relative mb-6 overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.18)] backdrop-blur dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_60px_-40px_rgba(0,0,0,0.55)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,83,117,0.09),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.45),transparent_70%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.08),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_70%)]" />
      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {eyebrow ? (
              <span className="inline-flex items-center rounded-full border border-border/70 bg-[#edf3fb] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#145375] dark:border-white/10 dark:bg-white/8 dark:text-sky-200">
                {eyebrow}
              </span>
            ) : null}
            {badge ? (
              <Badge className="rounded-full bg-[linear-gradient(135deg,#145375,#0b6b88)] px-3 text-white">
                {badge}
              </Badge>
            ) : null}
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
              {description}
            </p>
          </div>
        </div>

        {actions ? (
          <div className="flex flex-wrap justify-start gap-3 lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
