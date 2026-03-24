import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="rounded-[1.75rem] border-dashed border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(246,249,253,0.92))] shadow-none dark:border-white/12 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.03))]">
      <CardHeader className="gap-3">
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="max-w-xl text-sm leading-6">
          {description}
        </CardDescription>
      </CardHeader>
      {action ? <CardContent>{action}</CardContent> : null}
    </Card>
  );
}
