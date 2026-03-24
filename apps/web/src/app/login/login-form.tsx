"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type LoginFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getMessages, type Locale } from "@/lib/i18n";

const initialState: LoginFormState = {};

export function LoginForm({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  return (
    <Card className="rounded-[2rem] border-white/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.55)]">
      <CardHeader className="gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#145375] dark:text-sky-200">
          auto-x-to-wechat
        </p>
        <CardTitle className="text-2xl font-semibold">
          {messages.login.formTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="email">
              {messages.login.emailLabel}
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="demo@example.com"
              className="h-11 rounded-2xl border-border/70 bg-[#f5f9fd] px-4 dark:border-white/10 dark:bg-white/8 dark:text-white dark:placeholder:text-white/40"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="password">
              {messages.login.passwordLabel}
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="demo123456"
              className="h-11 rounded-2xl border-border/70 bg-[#f5f9fd] px-4 dark:border-white/10 dark:bg-white/8 dark:text-white dark:placeholder:text-white/40"
            />
          </div>
          {state.error ? (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-200">
              {state.error}
            </p>
          ) : null}
          <p className="rounded-[1.5rem] border border-border/70 bg-[#f5f9fd] px-4 py-3 text-sm leading-6 text-muted-foreground dark:border-white/10 dark:bg-white/8 dark:text-white/70">
            {messages.login.sessionHint}
          </p>
          <Button
            className="h-11 w-full rounded-full bg-[linear-gradient(135deg,#145375,#0b6b88)] text-white hover:brightness-105 dark:bg-[linear-gradient(135deg,#38bdf8,#2563eb)] dark:text-white"
            disabled={isPending}
            type="submit"
          >
            {isPending ? messages.login.submitting : messages.login.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
