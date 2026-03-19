import { BindingConsole, type BindingRecord } from "./binding-console";
import { PageHeader } from "@/components/page-header";
import { apiRequest } from "@/lib/api-client";

export default async function BindingsPage() {
  const currentBinding = await apiRequest<BindingRecord | null>({
    path: "/bindings/current",
    method: "GET",
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Bindings"
        description="这里已经接入绑定读取、凭证提交、重新校验、停用、抓取配置编辑和手动抓取联动。"
        badge={currentBinding?.status ?? "UNBOUND"}
      />
      <BindingConsole currentBinding={currentBinding} />
    </div>
  );
}
