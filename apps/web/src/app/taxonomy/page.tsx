import { TaxonomyConsole } from "./taxonomy-console";
import type { CategoryRecord, TagRecord } from "./taxonomy-types";
import { PageHeader } from "@/components/page-header";
import { formatMessage } from "@/lib/i18n";
import { apiRequest } from "@/lib/api-client";
import { getRequestMessages } from "@/lib/request-locale";

async function getTaxonomyData() {
  const [categoriesResult, tagsResult] = await Promise.allSettled([
    apiRequest<CategoryRecord[]>({
      path: "/taxonomy/categories?includeInactive=true",
      method: "GET",
    }),
    apiRequest<TagRecord[]>({
      path: "/taxonomy/tags?includeInactive=true",
      method: "GET",
    }),
  ]);

  return {
    categories:
      categoriesResult.status === "fulfilled" ? categoriesResult.value : [],
    tags: tagsResult.status === "fulfilled" ? tagsResult.value : [],
    hasError:
      categoriesResult.status === "rejected" || tagsResult.status === "rejected",
  };
}

export default async function TaxonomyPage() {
  const { locale, messages } = await getRequestMessages();
  const { categories, tags, hasError } = await getTaxonomyData();

  return (
    <div className="space-y-8">
      <PageHeader
        badge={formatMessage(messages.taxonomy.badge, {
          count: categories.length + tags.length,
        })}
        description={messages.taxonomy.description}
        eyebrow={messages.taxonomy.eyebrow}
        title={messages.taxonomy.title}
      />
      <TaxonomyConsole
        categories={categories}
        loadError={hasError ? messages.taxonomy.errorDescription : null}
        locale={locale}
        tags={tags}
      />
    </div>
  );
}
