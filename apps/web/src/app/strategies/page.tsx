import { type BindingRecord } from "../bindings/binding-types";
import { StrategyConsole } from "./strategy-console";
import { PageHeader } from "@/components/page-header";
import { apiRequest } from "@/lib/api-client";
import { getRequestMessages } from "@/lib/request-locale";

export default async function StrategiesPage() {
  const { locale, messages } = await getRequestMessages();
  const bindings = await apiRequest<BindingRecord[]>({
    path: "/bindings",
    method: "GET",
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={messages.strategies.eyebrow}
        title={messages.strategies.title}
        description={messages.strategies.description}
        badge={messages.strategies.accountCount.replace(
          "{count}",
          String(bindings.length),
        )}
      />
      <StrategyConsole bindings={bindings} locale={locale} />
    </div>
  );
}
