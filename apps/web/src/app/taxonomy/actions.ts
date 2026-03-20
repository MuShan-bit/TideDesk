"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiRequest, getApiErrorMessage } from "@/lib/api-client";
import { getRequestMessages } from "@/lib/request-locale";

export type TaxonomyActionState = {
  error?: string;
  success?: string;
};

const hexColorPattern =
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function getOptionalTextValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function getOptionalIntegerValue(formData: FormData, key: string) {
  const raw = getOptionalTextValue(formData, key);

  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw);

  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function getBooleanValue(formData: FormData, key: string, defaultValue = true) {
  const value = formData.get(key);

  if (value === "true" || value === "on") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return defaultValue;
}

function revalidateTaxonomyViews() {
  revalidatePath("/taxonomy");
  revalidatePath("/archives");
}

function createOptionalColorSchema(
  messages: Awaited<ReturnType<typeof getRequestMessages>>["messages"],
) {
  return z
    .string()
    .trim()
    .regex(hexColorPattern, messages.actions.taxonomy.invalidColor)
    .optional();
}

function createOptionalSortOrderSchema(
  messages: Awaited<ReturnType<typeof getRequestMessages>>["messages"],
) {
  return z.custom<number | undefined>(
    (value) =>
      value === undefined ||
      (typeof value === "number" && Number.isInteger(value)),
    {
      message: messages.actions.taxonomy.invalidSortOrder,
    },
  );
}

function createCategoryPayloadSchema(
  messages: Awaited<ReturnType<typeof getRequestMessages>>["messages"],
) {
  return z.object({
    name: z.string().trim().min(1, messages.actions.taxonomy.missingName),
    slug: z.string().trim().optional(),
    description: z.string().trim().optional(),
    color: createOptionalColorSchema(messages),
    isActive: z.boolean(),
    sortOrder: createOptionalSortOrderSchema(messages),
  });
}

function createTagPayloadSchema(
  messages: Awaited<ReturnType<typeof getRequestMessages>>["messages"],
) {
  return z.object({
    name: z.string().trim().min(1, messages.actions.taxonomy.missingName),
    slug: z.string().trim().optional(),
    color: createOptionalColorSchema(messages),
    isActive: z.boolean(),
  });
}

export async function createCategoryAction(
  _previousState: TaxonomyActionState,
  formData: FormData,
): Promise<TaxonomyActionState> {
  const { messages } = await getRequestMessages();
  const schema = createCategoryPayloadSchema(messages);
  const parsed = schema.safeParse({
    name: getOptionalTextValue(formData, "name") ?? "",
    slug: getOptionalTextValue(formData, "slug"),
    description: getOptionalTextValue(formData, "description"),
    color: getOptionalTextValue(formData, "color"),
    isActive: getBooleanValue(formData, "isActive"),
    sortOrder: getOptionalIntegerValue(formData, "sortOrder"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.taxonomy.categoryValidationFailed,
    } satisfies TaxonomyActionState;
  }

  try {
    await apiRequest({
      path: "/taxonomy/categories",
      method: "POST",
      body: JSON.stringify(parsed.data),
    });

    revalidateTaxonomyViews();

    return {
      success: messages.actions.taxonomy.categoryCreated,
    } satisfies TaxonomyActionState;
  } catch (error) {
    return {
      error: getApiErrorMessage(
        error,
        messages.actions.taxonomy.categoryValidationFailed,
      ),
    } satisfies TaxonomyActionState;
  }
}

export async function updateCategoryAction(
  _previousState: TaxonomyActionState,
  formData: FormData,
): Promise<TaxonomyActionState> {
  const { messages } = await getRequestMessages();
  const schema = createCategoryPayloadSchema(messages).extend({
    categoryId: z
      .string()
      .trim()
      .min(1, messages.actions.taxonomy.missingCategoryId),
  });
  const parsed = schema.safeParse({
    categoryId: getOptionalTextValue(formData, "categoryId") ?? "",
    name: getOptionalTextValue(formData, "name") ?? "",
    slug: getOptionalTextValue(formData, "slug"),
    description: getOptionalTextValue(formData, "description"),
    color: getOptionalTextValue(formData, "color"),
    isActive: getBooleanValue(formData, "isActive"),
    sortOrder: getOptionalIntegerValue(formData, "sortOrder"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.taxonomy.categoryValidationFailed,
    } satisfies TaxonomyActionState;
  }

  try {
    await apiRequest({
      path: `/taxonomy/categories/${parsed.data.categoryId}`,
      method: "PATCH",
      body: JSON.stringify({
        color: parsed.data.color,
        description: parsed.data.description,
        isActive: parsed.data.isActive,
        name: parsed.data.name,
        slug: parsed.data.slug,
        sortOrder: parsed.data.sortOrder,
      }),
    });

    revalidateTaxonomyViews();

    return {
      success: messages.actions.taxonomy.categoryUpdated,
    } satisfies TaxonomyActionState;
  } catch (error) {
    return {
      error: getApiErrorMessage(
        error,
        messages.actions.taxonomy.categoryValidationFailed,
      ),
    } satisfies TaxonomyActionState;
  }
}

export async function disableCategoryAction(
  _previousState: TaxonomyActionState,
  formData: FormData,
): Promise<TaxonomyActionState> {
  const { messages } = await getRequestMessages();
  const schema = z.object({
    categoryId: z
      .string()
      .trim()
      .min(1, messages.actions.taxonomy.missingCategoryId),
  });
  const parsed = schema.safeParse({
    categoryId: getOptionalTextValue(formData, "categoryId") ?? "",
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.taxonomy.categoryValidationFailed,
    } satisfies TaxonomyActionState;
  }

  try {
    await apiRequest({
      path: `/taxonomy/categories/${parsed.data.categoryId}/disable`,
      method: "POST",
    });

    revalidateTaxonomyViews();

    return {
      success: messages.actions.taxonomy.categoryDisabled,
    } satisfies TaxonomyActionState;
  } catch (error) {
    return {
      error: getApiErrorMessage(
        error,
        messages.actions.taxonomy.categoryValidationFailed,
      ),
    } satisfies TaxonomyActionState;
  }
}

export async function createTagAction(
  _previousState: TaxonomyActionState,
  formData: FormData,
): Promise<TaxonomyActionState> {
  const { messages } = await getRequestMessages();
  const schema = createTagPayloadSchema(messages);
  const parsed = schema.safeParse({
    name: getOptionalTextValue(formData, "name") ?? "",
    slug: getOptionalTextValue(formData, "slug"),
    color: getOptionalTextValue(formData, "color"),
    isActive: getBooleanValue(formData, "isActive"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.taxonomy.tagValidationFailed,
    } satisfies TaxonomyActionState;
  }

  try {
    await apiRequest({
      path: "/taxonomy/tags",
      method: "POST",
      body: JSON.stringify(parsed.data),
    });

    revalidateTaxonomyViews();

    return {
      success: messages.actions.taxonomy.tagCreated,
    } satisfies TaxonomyActionState;
  } catch (error) {
    return {
      error: getApiErrorMessage(
        error,
        messages.actions.taxonomy.tagValidationFailed,
      ),
    } satisfies TaxonomyActionState;
  }
}

export async function updateTagAction(
  _previousState: TaxonomyActionState,
  formData: FormData,
): Promise<TaxonomyActionState> {
  const { messages } = await getRequestMessages();
  const schema = createTagPayloadSchema(messages).extend({
    tagId: z.string().trim().min(1, messages.actions.taxonomy.missingTagId),
  });
  const parsed = schema.safeParse({
    tagId: getOptionalTextValue(formData, "tagId") ?? "",
    name: getOptionalTextValue(formData, "name") ?? "",
    slug: getOptionalTextValue(formData, "slug"),
    color: getOptionalTextValue(formData, "color"),
    isActive: getBooleanValue(formData, "isActive"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.taxonomy.tagValidationFailed,
    } satisfies TaxonomyActionState;
  }

  try {
    await apiRequest({
      path: `/taxonomy/tags/${parsed.data.tagId}`,
      method: "PATCH",
      body: JSON.stringify({
        color: parsed.data.color,
        isActive: parsed.data.isActive,
        name: parsed.data.name,
        slug: parsed.data.slug,
      }),
    });

    revalidateTaxonomyViews();

    return {
      success: messages.actions.taxonomy.tagUpdated,
    } satisfies TaxonomyActionState;
  } catch (error) {
    return {
      error: getApiErrorMessage(
        error,
        messages.actions.taxonomy.tagValidationFailed,
      ),
    } satisfies TaxonomyActionState;
  }
}

export async function disableTagAction(
  _previousState: TaxonomyActionState,
  formData: FormData,
): Promise<TaxonomyActionState> {
  const { messages } = await getRequestMessages();
  const schema = z.object({
    tagId: z.string().trim().min(1, messages.actions.taxonomy.missingTagId),
  });
  const parsed = schema.safeParse({
    tagId: getOptionalTextValue(formData, "tagId") ?? "",
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.taxonomy.tagValidationFailed,
    } satisfies TaxonomyActionState;
  }

  try {
    await apiRequest({
      path: `/taxonomy/tags/${parsed.data.tagId}/disable`,
      method: "POST",
    });

    revalidateTaxonomyViews();

    return {
      success: messages.actions.taxonomy.tagDisabled,
    } satisfies TaxonomyActionState;
  } catch (error) {
    return {
      error: getApiErrorMessage(
        error,
        messages.actions.taxonomy.tagValidationFailed,
      ),
    } satisfies TaxonomyActionState;
  }
}
