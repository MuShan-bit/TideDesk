"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createCategoryAction,
  createTagAction,
  disableCategoryAction as disableCategoryServerAction,
  disableTagAction as disableTagServerAction,
  type TaxonomyActionState,
  updateCategoryAction,
  updateTagAction,
} from "./actions";
import type { CategoryRecord, TagRecord } from "./taxonomy-types";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getMessages, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type TaxonomyConsoleProps = {
  categories: CategoryRecord[];
  loadError?: string | null;
  locale: Locale;
  tags: TagRecord[];
};

type TaxonomyDialogState =
  | { entity: "category"; mode: "create" }
  | { categoryId: string; entity: "category"; mode: "edit" }
  | { entity: "tag"; mode: "create" }
  | { entity: "tag"; mode: "edit"; tagId: string }
  | null;

const initialActionState: TaxonomyActionState = {};

function ActionFeedback({ state }: { state: TaxonomyActionState }) {
  if (state.error) {
    return (
      <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-200">
        {state.error}
      </div>
    );
  }

  if (state.success) {
    return (
      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100">
        {state.success}
      </div>
    );
  }

  return null;
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor: string;
}) {
  return (
    <label className="text-sm font-medium text-foreground" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

function SummaryCard({
  label,
  toneClassName,
  value,
}: {
  label: string;
  toneClassName: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-border/70 bg-white/88 p-5 shadow-[0_20px_60px_-42px_rgba(45,77,63,0.3)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_20px_60px_-42px_rgba(0,0,0,0.5)]">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-3xl font-semibold tracking-tight text-foreground">
          {value}
        </span>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            toneClassName,
          )}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function getStatusBadgeClassName(isActive: boolean) {
  return isActive
    ? "bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]"
    : "bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]";
}

function renderColorToken(color: string | null, emptyLabel: string) {
  if (!color) {
    return (
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-white/70">
        {emptyLabel}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-white/80">
      <span
        aria-hidden="true"
        className="size-2.5 rounded-full border border-black/10 dark:border-white/20"
        style={{ backgroundColor: color }}
      />
      {color}
    </span>
  );
}

function TaxonomyDialogForm({
  categories,
  dialogState,
  locale,
  onClose,
  tags,
}: {
  categories: CategoryRecord[];
  dialogState: Exclude<TaxonomyDialogState, null>;
  locale: Locale;
  onClose: () => void;
  tags: TagRecord[];
}) {
  const messages = getMessages(locale);
  const [createCategoryState, createCategoryFormAction, isCreatingCategory] =
    useActionState(createCategoryAction, initialActionState);
  const [updateCategoryState, updateCategoryFormAction, isUpdatingCategory] =
    useActionState(updateCategoryAction, initialActionState);
  const [createTagState, createTagFormAction, isCreatingTag] = useActionState(
    createTagAction,
    initialActionState,
  );
  const [updateTagState, updateTagFormAction, isUpdatingTag] = useActionState(
    updateTagAction,
    initialActionState,
  );

  const editingCategory =
    dialogState.entity === "category" && dialogState.mode === "edit"
      ? (categories.find(
          (category) => category.id === dialogState.categoryId,
        ) ?? null)
      : null;
  const editingTag =
    dialogState.entity === "tag" && dialogState.mode === "edit"
      ? (tags.find((tag) => tag.id === dialogState.tagId) ?? null)
      : null;

  const activeState =
    dialogState.entity === "category"
      ? dialogState.mode === "create"
        ? createCategoryState
        : updateCategoryState
      : dialogState.mode === "create"
        ? createTagState
        : updateTagState;
  const action =
    dialogState.entity === "category"
      ? dialogState.mode === "create"
        ? createCategoryFormAction
        : updateCategoryFormAction
      : dialogState.mode === "create"
        ? createTagFormAction
        : updateTagFormAction;
  const isPending =
    dialogState.entity === "category"
      ? dialogState.mode === "create"
        ? isCreatingCategory
        : isUpdatingCategory
      : dialogState.mode === "create"
        ? isCreatingTag
        : isUpdatingTag;

  useEffect(() => {
    if (activeState.success) {
      onClose();
    }
  }, [activeState.success, onClose]);

  if (
    dialogState.entity === "category" &&
    dialogState.mode === "edit" &&
    !editingCategory
  ) {
    return null;
  }

  if (
    dialogState.entity === "tag" &&
    dialogState.mode === "edit" &&
    !editingTag
  ) {
    return null;
  }

  const isCategory = dialogState.entity === "category";
  const title = isCategory
    ? dialogState.mode === "create"
      ? messages.taxonomy.createCategory
      : messages.taxonomy.editCategory
    : dialogState.mode === "create"
      ? messages.taxonomy.createTag
      : messages.taxonomy.editTag;
  const description = isCategory
    ? dialogState.mode === "create"
      ? messages.taxonomy.createCategoryDescription
      : messages.taxonomy.editCategoryDescription
    : dialogState.mode === "create"
      ? messages.taxonomy.createTagDescription
      : messages.taxonomy.editTagDescription;

  const itemName = isCategory ? "category" : "tag";
  const currentStatus =
    editingCategory?.isActive ?? editingTag?.isActive ?? true;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-none rounded-[2rem] border-border/70 bg-white p-0 dark:border-white/10 dark:bg-[#111713]"
        style={{ maxWidth: "56rem", width: "min(96vw, 56rem)" }}
      >
        <div className="space-y-6 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl text-foreground">
              {title}
            </DialogTitle>
            <DialogDescription className="leading-6">
              {description}
            </DialogDescription>
          </DialogHeader>

          <form action={action} className="space-y-5">
            {dialogState.entity === "category" &&
            dialogState.mode === "edit" ? (
              <input
                name="categoryId"
                type="hidden"
                value={editingCategory!.id}
              />
            ) : null}
            {dialogState.entity === "tag" && dialogState.mode === "edit" ? (
              <input name="tagId" type="hidden" value={editingTag!.id} />
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor={`${itemName}-name`}>
                  {messages.taxonomy.form.nameLabel}
                </FieldLabel>
                <Input
                  className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
                  defaultValue={editingCategory?.name ?? editingTag?.name ?? ""}
                  id={`${itemName}-name`}
                  name="name"
                  placeholder={
                    isCategory
                      ? messages.taxonomy.form.categoryNamePlaceholder
                      : messages.taxonomy.form.tagNamePlaceholder
                  }
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor={`${itemName}-slug`}>
                  {messages.taxonomy.form.slugLabel}
                </FieldLabel>
                <Input
                  className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
                  defaultValue={editingCategory?.slug ?? editingTag?.slug ?? ""}
                  id={`${itemName}-slug`}
                  name="slug"
                  placeholder={messages.taxonomy.form.slugPlaceholder}
                />
              </div>
            </div>

            {isCategory ? (
              <div className="space-y-2">
                <FieldLabel htmlFor="category-description">
                  {messages.taxonomy.form.descriptionLabel}
                </FieldLabel>
                <textarea
                  className="min-h-28 w-full rounded-[1.5rem] border border-border/70 bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/10"
                  defaultValue={editingCategory?.description ?? ""}
                  id="category-description"
                  name="description"
                  placeholder={
                    messages.taxonomy.form.categoryDescriptionPlaceholder
                  }
                />
              </div>
            ) : null}

            <div
              className={cn(
                "grid gap-4",
                isCategory ? "sm:grid-cols-3" : "sm:grid-cols-2",
              )}
            >
              <div className="space-y-2">
                <FieldLabel htmlFor={`${itemName}-color`}>
                  {messages.taxonomy.form.colorLabel}
                </FieldLabel>
                <Input
                  className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
                  defaultValue={
                    editingCategory?.color ?? editingTag?.color ?? ""
                  }
                  id={`${itemName}-color`}
                  name="color"
                  placeholder={messages.taxonomy.form.colorPlaceholder}
                />
              </div>

              {isCategory ? (
                <div className="space-y-2">
                  <FieldLabel htmlFor="category-sort-order">
                    {messages.taxonomy.form.sortOrderLabel}
                  </FieldLabel>
                  <Input
                    className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
                    defaultValue={editingCategory?.sortOrder ?? ""}
                    id="category-sort-order"
                    name="sortOrder"
                    placeholder="0"
                    step="1"
                    type="number"
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <FieldLabel htmlFor={`${itemName}-status`}>
                  {messages.taxonomy.form.statusLabel}
                </FieldLabel>
                <select
                  className="h-11 w-full rounded-2xl border border-border/70 bg-white px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/10"
                  defaultValue={currentStatus ? "true" : "false"}
                  id={`${itemName}-status`}
                  name="isActive"
                >
                  <option value="true">{messages.taxonomy.statusActive}</option>
                  <option value="false">
                    {messages.taxonomy.statusInactive}
                  </option>
                </select>
              </div>
            </div>

            <ActionFeedback state={activeState} />

            <div className="flex flex-wrap justify-end gap-3">
              <Button
                className="h-11 rounded-full px-5"
                onClick={onClose}
                type="button"
                variant="outline"
              >
                {messages.taxonomy.cancel}
              </Button>
              <Button
                className="h-11 rounded-full bg-[#2d4d3f] px-5 text-white hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
                disabled={isPending}
                type="submit"
              >
                {isPending
                  ? messages.taxonomy.saving
                  : isCategory
                    ? messages.taxonomy.saveCategory
                    : messages.taxonomy.saveTag}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategorySection({
  categories,
  disableState,
  formAction,
  isPending,
  locale,
  onCreate,
  onEdit,
}: {
  categories: CategoryRecord[];
  disableState: TaxonomyActionState;
  formAction: (payload: FormData) => void;
  isPending: boolean;
  locale: Locale;
  onCreate: () => void;
  onEdit: (categoryId: string) => void;
}) {
  const messages = getMessages(locale);

  return (
    <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.24)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="text-2xl">
              {messages.taxonomy.categoriesTitle}
            </CardTitle>
            <CardDescription className="leading-6">
              {messages.taxonomy.categoriesDescription}
            </CardDescription>
          </div>
          <Button
            className="h-11 rounded-full bg-[#2d4d3f] px-5 text-white hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
            onClick={onCreate}
            type="button"
          >
            {messages.taxonomy.createCategory}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ActionFeedback state={disableState} />
        {categories.length > 0 ? (
          <div className="overflow-hidden border border-border/70 bg-[#fcfaf5] dark:border-white/10 dark:bg-white/8">
            <Table>
              <TableHeader className="bg-white/70 dark:bg-white/6 [&_tr]:border-border/60 dark:[&_tr]:border-white/10">
                <TableRow className="hover:bg-transparent">
                  <TableHead>{messages.taxonomy.form.nameLabel}</TableHead>
                  <TableHead>{messages.taxonomy.form.slugLabel}</TableHead>
                  <TableHead>{messages.taxonomy.form.colorLabel}</TableHead>
                  <TableHead>{messages.taxonomy.form.sortOrderLabel}</TableHead>
                  <TableHead className="w-[10rem] text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow
                    key={category.id}
                    className="border-border/60 dark:border-white/10"
                  >
                    <TableCell className="py-3 align-top whitespace-normal">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">
                            {category.name}
                          </span>
                          <Badge
                            className={cn(
                              "rounded-full",
                              getStatusBadgeClassName(category.isActive),
                            )}
                          >
                            {category.isActive
                              ? messages.taxonomy.statusActive
                              : messages.taxonomy.statusInactive}
                          </Badge>
                          <Badge className="rounded-full bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/80">
                            {category.isSystem
                              ? messages.taxonomy.systemBadge
                              : messages.taxonomy.customBadge}
                          </Badge>
                        </div>
                        <p className="max-w-md text-xs leading-5 text-muted-foreground">
                          {category.description ??
                            messages.taxonomy.noCategoryDescription}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-muted-foreground">
                      /{category.slug}
                    </TableCell>
                    <TableCell className="py-3 whitespace-normal">
                      {renderColorToken(
                        category.color,
                        messages.taxonomy.noColor,
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-foreground">
                      {category.sortOrder}
                    </TableCell>
                    <TableCell className="py-3">
                      {!category.isSystem ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            className="h-9 rounded-full px-4"
                            onClick={() => onEdit(category.id)}
                            type="button"
                            variant="outline"
                          >
                            {messages.taxonomy.edit}
                          </Button>
                          {category.isActive ? (
                            <form action={formAction}>
                              <input
                                name="categoryId"
                                type="hidden"
                                value={category.id}
                              />
                              <Button
                                className="h-9 rounded-full px-4"
                                disabled={isPending}
                                onClick={(event) => {
                                  if (
                                    !window.confirm(
                                      messages.taxonomy.disableCategoryConfirm,
                                    )
                                  ) {
                                    event.preventDefault();
                                  }
                                }}
                                type="submit"
                                variant="outline"
                              >
                                {messages.taxonomy.disable}
                              </Button>
                            </form>
                          ) : null}
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            description={messages.taxonomy.emptyCategories}
            title={messages.taxonomy.categoriesTitle}
          />
        )}
      </CardContent>
    </Card>
  );
}

function TagSection({
  disableState,
  formAction,
  isPending,
  locale,
  onCreate,
  onEdit,
  tags,
}: {
  disableState: TaxonomyActionState;
  formAction: (payload: FormData) => void;
  isPending: boolean;
  locale: Locale;
  onCreate: () => void;
  onEdit: (tagId: string) => void;
  tags: TagRecord[];
}) {
  const messages = getMessages(locale);

  return (
    <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.24)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="text-2xl">
              {messages.taxonomy.tagsTitle}
            </CardTitle>
            <CardDescription className="leading-6">
              {messages.taxonomy.tagsDescription}
            </CardDescription>
          </div>
          <Button
            className="h-11 rounded-full bg-[#2d4d3f] px-5 text-white hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
            onClick={onCreate}
            type="button"
          >
            {messages.taxonomy.createTag}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ActionFeedback state={disableState} />
        {tags.length > 0 ? (
          <div className="overflow-hidden border border-border/70 bg-[#fcfaf5] dark:border-white/10 dark:bg-white/8">
            <Table>
              <TableHeader className="bg-white/70 dark:bg-white/6 [&_tr]:border-border/60 dark:[&_tr]:border-white/10">
                <TableRow className="hover:bg-transparent">
                  <TableHead>{messages.taxonomy.form.nameLabel}</TableHead>
                  <TableHead>{messages.taxonomy.form.slugLabel}</TableHead>
                  <TableHead>{messages.taxonomy.form.colorLabel}</TableHead>
                  <TableHead className="w-[10rem] text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag) => (
                  <TableRow
                    key={tag.id}
                    className="border-border/60 dark:border-white/10"
                  >
                    <TableCell className="py-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">
                            {tag.name}
                          </span>
                          <Badge
                            className={cn(
                              "rounded-full",
                              getStatusBadgeClassName(tag.isActive),
                            )}
                          >
                            {tag.isActive
                              ? messages.taxonomy.statusActive
                              : messages.taxonomy.statusInactive}
                          </Badge>
                          <Badge className="rounded-full bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/80">
                            {tag.isSystem
                              ? messages.taxonomy.systemBadge
                              : messages.taxonomy.customBadge}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-muted-foreground">
                      /{tag.slug}
                    </TableCell>
                    <TableCell className="py-3">
                      {renderColorToken(tag.color, messages.taxonomy.noColor)}
                    </TableCell>
                    <TableCell className="py-3">
                      {!tag.isSystem ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            className="h-9 rounded-full px-4"
                            onClick={() => onEdit(tag.id)}
                            type="button"
                            variant="outline"
                          >
                            {messages.taxonomy.edit}
                          </Button>
                          {tag.isActive ? (
                            <form action={formAction}>
                              <input
                                name="tagId"
                                type="hidden"
                                value={tag.id}
                              />
                              <Button
                                className="h-9 rounded-full px-4"
                                disabled={isPending}
                                onClick={(event) => {
                                  if (
                                    !window.confirm(
                                      messages.taxonomy.disableTagConfirm,
                                    )
                                  ) {
                                    event.preventDefault();
                                  }
                                }}
                                type="submit"
                                variant="outline"
                              >
                                {messages.taxonomy.disable}
                              </Button>
                            </form>
                          ) : null}
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            description={messages.taxonomy.emptyTags}
            title={messages.taxonomy.tagsTitle}
          />
        )}
      </CardContent>
    </Card>
  );
}

export function TaxonomyConsole({
  categories,
  loadError,
  locale,
  tags,
}: TaxonomyConsoleProps) {
  const messages = getMessages(locale);
  const [dialogState, setDialogState] = useState<TaxonomyDialogState>(null);
  const [categoryDisableState, categoryDisableFormAction, isCategoryDisabling] =
    useActionState(disableCategoryServerAction, initialActionState);
  const [tagDisableState, tagDisableFormAction, isTagDisabling] =
    useActionState(disableTagServerAction, initialActionState);

  const totalCategories = categories.length;
  const activeCategories = categories.filter(
    (category) => category.isActive,
  ).length;
  const totalTags = tags.length;
  const activeTags = tags.filter((tag) => tag.isActive).length;

  return (
    <div className="space-y-8">
      {loadError ? (
        <div className="rounded-[1.75rem] border border-red-200 bg-red-50/80 px-5 py-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
          <p className="font-medium">{messages.taxonomy.errorTitle}</p>
          <p className="mt-1 leading-6">{loadError}</p>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label={messages.taxonomy.summary.totalCategories}
          toneClassName="bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]"
          value={String(totalCategories)}
        />
        <SummaryCard
          label={messages.taxonomy.summary.activeCategories}
          toneClassName="bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]"
          value={String(activeCategories)}
        />
        <SummaryCard
          label={messages.taxonomy.summary.totalTags}
          toneClassName="bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]"
          value={String(totalTags)}
        />
        <SummaryCard
          label={messages.taxonomy.summary.activeTags}
          toneClassName="bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]"
          value={String(activeTags)}
        />
      </section>

      <section className="space-y-6">
        <CategorySection
          categories={categories}
          disableState={categoryDisableState}
          formAction={categoryDisableFormAction}
          isPending={isCategoryDisabling}
          locale={locale}
          onCreate={() =>
            setDialogState({ entity: "category", mode: "create" })
          }
          onEdit={(categoryId) =>
            setDialogState({ categoryId, entity: "category", mode: "edit" })
          }
        />
        <TagSection
          disableState={tagDisableState}
          formAction={tagDisableFormAction}
          isPending={isTagDisabling}
          locale={locale}
          onCreate={() => setDialogState({ entity: "tag", mode: "create" })}
          onEdit={(tagId) =>
            setDialogState({ entity: "tag", mode: "edit", tagId })
          }
          tags={tags}
        />
      </section>

      {dialogState ? (
        <TaxonomyDialogForm
          key={JSON.stringify(dialogState)}
          categories={categories}
          dialogState={dialogState}
          locale={locale}
          onClose={() => setDialogState(null)}
          tags={tags}
        />
      ) : null}
    </div>
  );
}
