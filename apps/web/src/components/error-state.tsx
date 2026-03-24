import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ErrorStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function ErrorState({ title, description, action }: ErrorStateProps) {
  return (
    <Card className="rounded-[1.75rem] border-red-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,246,240,0.96))] shadow-[0_24px_60px_-40px_rgba(185,92,0,0.24)] dark:border-red-400/25 dark:bg-[linear-gradient(180deg,rgba(52,29,24,0.94),rgba(43,24,24,0.94))] dark:shadow-[0_24px_60px_-40px_rgba(0,0,0,0.55)]">
      <CardHeader className="gap-3">
        <div className="flex items-center gap-3 text-[#b95c00] dark:text-[#ffb366]">
          <AlertTriangle className="size-5" />
          <CardTitle className="text-xl">{title}</CardTitle>
        </div>
        <CardDescription className="max-w-2xl leading-6 text-[#8b4a00] dark:text-[#ffd1a1]">
          {description}
        </CardDescription>
      </CardHeader>
      {action ? <CardContent>{action}</CardContent> : null}
    </Card>
  );
}
