"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ElementType,
} from "react";

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  PauseCircle,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { TemplateRow } from "@/features/inbox/services/templates";

import {
  sanitizeTemplateName,
  type TemplateButton,
  type TemplateVariable,
} from "@/features/settings/lib/template-form";

import {
  TemplateFormSheet,
  type TemplatePrefill,
} from "./template-form-sheet";

import { CostCalculator } from "./cost-calculator";

/* =========================================================
   STATUS
========================================================= */

type StatusKey = TemplateRow["status"];

const STATUS_CONFIG: Record<
  StatusKey,
  {
    label: string;
    className: string;
    Icon: ElementType;
  }
> = {
  approved: {
    label: "Aprobado",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    Icon: CheckCircle2,
  },

  submitted: {
    label: "Pendiente",
    className:
      "border-amber-200 bg-amber-50 text-amber-700",
    Icon: Clock,
  },

  draft: {
    label: "Borrador",
    className:
      "border-slate-200 bg-slate-50 text-slate-500",
    Icon: FileText,
  },

  rejected: {
    label: "Rechazado",
    className:
      "border-red-200 bg-red-50 text-red-600",
    Icon: XCircle,
  },

  paused: {
    label: "Pausado",
    className:
      "border-orange-200 bg-orange-50 text-orange-600",
    Icon: PauseCircle,
  },
};

/* =========================================================
   FILTERS
========================================================= */

type FilterKey = "all" | StatusKey;

const FILTERS: {
  value: FilterKey;
  label: string;
}[] = [
  {
    value: "all",
    label: "Todos",
  },
  {
    value: "approved",
    label: "Aprobados",
  },
  {
    value: "submitted",
    label: "Pendientes",
  },
  {
    value: "rejected",
    label: "Rechazados",
  },
];

/* =========================================================
   LIBRARY
========================================================= */

interface LibraryItem {
  id: string;
  title: string;
  description: string | null;
  use_case: string | null;
  category: string;
  language: string;
  header_type: "none" | "text";
  header_text: string | null;
  body_template: string;
  footer_text: string | null;
  buttons: unknown[];
  variables: unknown[];
  sort_order: number;
}

function libraryToPrefill(
  item: LibraryItem,
): TemplatePrefill {
  return {
    name: sanitizeTemplateName(
      item.title,
    ),

    category:
      item.category === "marketing"
        ? "marketing"
        : "utility",

    header_type:
      item.header_type === "text"
        ? "text"
        : "none",

    header_text:
      item.header_text ?? "",

    body_template:
      item.body_template,

    body_variables:
      Array.isArray(item.variables)
        ? (item.variables as TemplateVariable[])
        : [],

    footer_text:
      item.footer_text ?? "",

    buttons:
      Array.isArray(item.buttons)
        ? (item.buttons as TemplateButton[])
        : [],
  };
}

/* =========================================================
   SKELETON
========================================================= */

function TemplatesSkeleton() {
  return (
    <div
      className="space-y-2.5"
      aria-busy="true"
      aria-label="Cargando plantillas"
    >
      {Array.from({
        length: 3,
      }).map((_, index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-50"
        />
      ))}
    </div>
  );
}

/* =========================================================
   EMPTY
========================================================= */

function EmptyState({
  filtered,
  onNew,
}: {
  filtered: boolean;
  onNew: () => void;
}) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/40 px-6 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
        <FileText className="h-5 w-5" />
      </div>

      <p className="text-sm font-semibold text-slate-700">
        {filtered
          ? "Sin resultados"
          : "Sin plantillas"}
      </p>

      <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
        {filtered
          ? "No hay plantillas que coincidan con este filtro."
          : "Crea tu primera plantilla, usa una desde la biblioteca o sincroniza desde YCloud."}
      </p>

      {!filtered && (
        <Button
          size="sm"
          onClick={onNew}
          className="mt-4 h-9 rounded-lg px-4 text-xs"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nueva plantilla
        </Button>
      )}
    </div>
  );
}

/* =========================================================
   TEMPLATE ITEM
========================================================= */

function TemplateItem({
  template,
  onEdit,
  onDelete,
  onSubmit,
  submitting,
}: {
  template: TemplateRow;
  onEdit: (
    template: TemplateRow,
  ) => void;
  onDelete: (
    template: TemplateRow,
  ) => void;
  onSubmit: (
    template: TemplateRow,
  ) => void;
  submitting: boolean;
}) {
  const cfg =
    STATUS_CONFIG[
      template.status
    ] ?? STATUS_CONFIG.draft;

  const { Icon } = cfg;

  const canSubmit =
    template.status === "draft" ||
    template.status ===
      "rejected";

  const canDelete = canSubmit;

  const variableCount =
    Array.isArray(
      template.variables,
    )
      ? template.variables.length
      : 0;

  const bodyPreview =
    template.body_template
      ? template.body_template.slice(
          0,
          140,
        ) +
        (template.body_template
          .length > 140
          ? "…"
          : "")
      : "";

  function handleCopy() {
    navigator.clipboard.writeText(
      template.body_template ??
        "",
    );

    toast.success(
      "Cuerpo copiado al portapapeles",
    );
  }

  return (
    <article className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm">
      {/* TOP */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-800">
              {template.name}
            </p>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-500">
              {template.language}
            </span>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-medium capitalize text-slate-500">
              {template.category}
            </span>
          </div>

          {bodyPreview && (
            <p className="mt-2 max-w-3xl whitespace-pre-line text-xs leading-relaxed text-slate-500">
              {bodyPreview}
            </p>
          )}
        </div>

        <span
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium",
            cfg.className,
          )}
        >
          <Icon className="h-3 w-3" />

          {cfg.label}
        </span>
      </div>

      {/* META */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {variableCount > 0 && (
          <span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-medium text-violet-700">
            {variableCount}{" "}
            {variableCount === 1
              ? "variable"
              : "variables"}
          </span>
        )}

        {template.rejection_reason && (
          <span className="text-[10px] text-red-500">
            Motivo:{" "}
            {
              template.rejection_reason
            }
          </span>
        )}
      </div>

      {/* ACTIONS */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              onEdit(template)
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label={`Editar ${template.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label={`Copiar cuerpo de ${template.name}`}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>

          {canDelete && (
            <button
              type="button"
              onClick={() =>
                onDelete(template)
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
              aria-label={`Eliminar ${template.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {canSubmit && (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onSubmit(template)
            }
            disabled={submitting}
            aria-busy={
              submitting
            }
            className="h-8 rounded-lg px-3 text-[10px]"
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />

            {submitting
              ? "Enviando…"
              : "Enviar a aprobación"}
          </Button>
        )}
      </div>
    </article>
  );
}

/* =========================================================
   LIBRARY CARD
========================================================= */

function LibraryCard({
  item,
  onUse,
}: {
  item: LibraryItem;
  onUse: (
    item: LibraryItem,
  ) => void;
}) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-800">
            {item.title}
          </h3>

          {item.description && (
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {item.description}
            </p>
          )}
        </div>

        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-1 text-[9px] font-medium",
            item.category ===
              "utility"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700",
          )}
        >
          {item.category ===
          "utility"
            ? "Utilidad"
            : "Marketing"}
        </span>
      </div>

      <div className="mt-3 flex-1 rounded-lg border border-slate-100 bg-slate-50 p-3">
        <p className="line-clamp-4 whitespace-pre-line text-[11px] leading-relaxed text-slate-500">
          {item.body_template}
        </p>
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          onUse(item)
        }
        className="mt-3 h-8 self-start rounded-lg px-3 text-[10px]"
      >
        Usar plantilla

        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
      </Button>
    </article>
  );
}

/* =========================================================
   MAIN
========================================================= */

type View =
  | "mine"
  | "library";

interface Props {
  workspaceId: string;
  initialTemplates: unknown[];
}

export function TemplatesTab({
  workspaceId,
  initialTemplates,
}: Props) {
  const [view, setView] =
    useState<View>("mine");

  const [
    templates,
    setTemplates,
  ] = useState<TemplateRow[]>(
    (initialTemplates ??
      []) as TemplateRow[],
  );

  const [
    isLoadingTemplates,
    setIsLoadingTemplates,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState<string | null>(
    null,
  );

  const [
    isSyncing,
    setIsSyncing,
  ] = useState(false);

  const [filter, setFilter] =
    useState<FilterKey>("all");

  const [
    submittingId,
    setSubmittingId,
  ] = useState<string | null>(
    null,
  );

  const [
    library,
    setLibrary,
  ] = useState<
    LibraryItem[]
  >([]);

  const [
    libraryLoading,
    setLibraryLoading,
  ] = useState(false);

  const [
    libraryLoaded,
    setLibraryLoaded,
  ] = useState(false);

  const [
    sheetOpen,
    setSheetOpen,
  ] = useState(false);

  const [
    editingTemplate,
    setEditingTemplate,
  ] = useState<
    TemplateRow | undefined
  >(undefined);

  const [
    prefill,
    setPrefill,
  ] =
    useState<TemplatePrefill | null>(
      null,
    );

  /* =====================================================
     FETCH TEMPLATES
  ===================================================== */

  const fetchTemplates =
    useCallback(async () => {
      setIsLoadingTemplates(
        true,
      );

      setLoadError(null);

      try {
        const res = await fetch(
          `/api/workspace/${workspaceId}/templates`,
        );

        const json =
          (await res.json()) as {
            data?: TemplateRow[];
            error?: string;
          };

        if (!res.ok) {
          throw new Error(
            json.error ??
              "Error al cargar plantillas",
          );
        }

        setTemplates(
          json.data ?? [],
        );
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Error al cargar plantillas",
        );
      } finally {
        setIsLoadingTemplates(
          false,
        );
      }
    }, [workspaceId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  /* =====================================================
     LIBRARY
  ===================================================== */

  const fetchLibrary =
    useCallback(async () => {
      if (libraryLoaded) {
        return;
      }

      setLibraryLoading(true);

      try {
        const res = await fetch(
          `/api/workspace/${workspaceId}/templates/library`,
        );

        const json =
          (await res.json()) as {
            data?: LibraryItem[];
            error?: string;
          };

        if (!res.ok) {
          throw new Error(
            json.error ??
              "Error al cargar biblioteca",
          );
        }

        setLibrary(
          json.data ?? [],
        );

        setLibraryLoaded(true);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Error al cargar biblioteca",
        );
      } finally {
        setLibraryLoading(
          false,
        );
      }
    }, [
      workspaceId,
      libraryLoaded,
    ]);

  function switchView(
    next: View,
  ) {
    setView(next);

    if (
      next === "library"
    ) {
      void fetchLibrary();
    }
  }

  /* =====================================================
     SYNC
  ===================================================== */

  async function handleSync() {
    setIsSyncing(true);

    try {
      const res = await fetch(
        `/api/workspace/${workspaceId}/templates/sync`,
        {
          method: "POST",
        },
      );

      const json =
        (await res.json()) as {
          synced?: number;
          errors?: number;
          error?: string;
        };

      if (!res.ok) {
        throw new Error(
          json.error ??
            "Error al sincronizar",
        );
      }

      toast.success(
        `Sincronizadas ${
          json.synced ?? 0
        } plantillas${
          json.errors
            ? ` · ${json.errors} errores`
            : ""
        }`,
      );

      await fetchTemplates();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al sincronizar",
      );
    } finally {
      setIsSyncing(false);
    }
  }

  /* =====================================================
     SUBMIT
  ===================================================== */

  async function handleSubmitTemplate(
    template: TemplateRow,
  ) {
    setSubmittingId(
      template.id,
    );

    try {
      const res = await fetch(
        `/api/workspace/${workspaceId}/templates/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: template.id,
          }),
        },
      );

      const json =
        (await res.json()) as {
          warning?: string;
          error?: string;
        };

      if (!res.ok) {
        throw new Error(
          json.error ??
            "Error al enviar",
        );
      }

      toast.success(
        "Plantilla enviada a aprobación",
      );

      if (json.warning) {
        toast(json.warning);
      }

      await fetchTemplates();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al enviar",
      );
    } finally {
      setSubmittingId(null);
    }
  }

  /* =====================================================
     DELETE
  ===================================================== */

  async function handleDelete(
    template: TemplateRow,
  ) {
    if (
      !window.confirm(
        `¿Eliminar la plantilla "${template.name}"? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        `/api/workspace/${workspaceId}/templates`,
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: template.id,
          }),
        },
      );

      const json =
        (await res.json()) as {
          error?: string;
        };

      if (!res.ok) {
        throw new Error(
          json.error ??
            "Error al eliminar",
        );
      }

      toast.success(
        "Plantilla eliminada",
      );

      setTemplates(
        (previous) =>
          previous.filter(
            (item) =>
              item.id !==
              template.id,
          ),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al eliminar",
      );
    }
  }

  /* =====================================================
     SHEET
  ===================================================== */

  function openNew() {
    setEditingTemplate(
      undefined,
    );

    setPrefill(null);

    setSheetOpen(true);
  }

  function openEdit(
    template: TemplateRow,
  ) {
    setEditingTemplate(
      template,
    );

    setPrefill(null);

    setSheetOpen(true);
  }

  function openFromLibrary(
    item: LibraryItem,
  ) {
    setEditingTemplate(
      undefined,
    );

    setPrefill(
      libraryToPrefill(item),
    );

    setSheetOpen(true);
  }

  /* =====================================================
     DERIVED
  ===================================================== */

  const approvedCount =
    templates.filter(
      (template) =>
        template.status ===
        "approved",
    ).length;

  const pendingCount =
    templates.filter(
      (template) =>
        template.status ===
        "submitted",
    ).length;

  const filtered =
    filter === "all"
      ? templates
      : templates.filter(
          (template) =>
            template.status ===
            filter,
        );

  function getFilterCount(
    value: FilterKey,
  ) {
    if (value === "all") {
      return templates.length;
    }

    return templates.filter(
      (template) =>
        template.status ===
        value,
    ).length;
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <>
      <div className="space-y-5">
        {/* TOP HEADER */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Plantillas de WhatsApp
            </h2>

            {view === "mine" &&
              !isLoadingTemplates &&
              !loadError && (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span>
                    {templates.length}{" "}
                    {templates.length ===
                    1
                      ? "plantilla"
                      : "plantillas"}
                  </span>

                  {approvedCount >
                    0 && (
                    <>
                      <span>
                        •
                      </span>

                      <span className="text-emerald-600">
                        {
                          approvedCount
                        }{" "}
                        aprobadas
                      </span>
                    </>
                  )}

                  {pendingCount >
                    0 && (
                    <>
                      <span>
                        •
                      </span>

                      <span className="text-amber-600">
                        {
                          pendingCount
                        }{" "}
                        pendientes
                      </span>
                    </>
                  )}
                </div>
              )}
          </div>

          {view === "mine" && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs">
                <CostCalculator />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={
                  isSyncing
                }
                aria-busy={
                  isSyncing
                }
                className="h-9 rounded-lg px-3 text-[11px]"
              >
                <RefreshCw
                  className={cn(
                    "mr-1.5 h-3.5 w-3.5",
                    isSyncing &&
                      "animate-spin",
                  )}
                />

                {isSyncing
                  ? "Sincronizando…"
                  : "Sincronizar"}
              </Button>

              <Button
                size="sm"
                onClick={openNew}
                className="h-9 rounded-lg px-4 text-[11px]"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />

                Nueva plantilla
              </Button>
            </div>
          )}
        </div>

        {/* VIEW TOGGLE */}
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() =>
              switchView("mine")
            }
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-medium transition-all",
              view === "mine"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-400 hover:text-slate-700",
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            Mis plantillas
          </button>

          <button
            type="button"
            onClick={() =>
              switchView(
                "library",
              )
            }
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-medium transition-all",
              view ===
                "library"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-400 hover:text-slate-700",
            )}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Biblioteca
          </button>
        </div>

        {/* MINE */}
        {view === "mine" && (
          <>
            {/* FILTERS */}
            <div className="flex flex-wrap gap-2">
              {FILTERS.map(
                (item) => {
                  const active =
                    filter ===
                    item.value;

                  return (
                    <button
                      key={
                        item.value
                      }
                      type="button"
                      onClick={() =>
                        setFilter(
                          item.value,
                        )
                      }
                      className={cn(
                        "flex h-8 items-center gap-1.5 rounded-full border px-3 text-[10px] font-medium transition-colors",
                        active
                          ? "border-violet-200 bg-violet-50 text-violet-700"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                      )}
                    >
                      {
                        item.label
                      }

                      <span
                        className={cn(
                          "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px]",
                          active
                            ? "bg-violet-100 text-violet-700"
                            : "bg-slate-100 text-slate-400",
                        )}
                      >
                        {getFilterCount(
                          item.value,
                        )}
                      </span>
                    </button>
                  );
                },
              )}
            </div>

            {isLoadingTemplates ? (
              <TemplatesSkeleton />
            ) : loadError ? (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
                <span>
                  {loadError}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={
                    fetchTemplates
                  }
                  className="h-8 shrink-0 rounded-lg text-[10px]"
                >
                  Reintentar
                </Button>
              </div>
            ) : filtered.length ===
              0 ? (
              <EmptyState
                filtered={
                  filter !==
                  "all"
                }
                onNew={openNew}
              />
            ) : (
              <div className="space-y-2.5">
                {filtered.map(
                  (template) => (
                    <TemplateItem
                      key={
                        template.id
                      }
                      template={
                        template
                      }
                      onEdit={
                        openEdit
                      }
                      onDelete={
                        handleDelete
                      }
                      onSubmit={
                        handleSubmitTemplate
                      }
                      submitting={
                        submittingId ===
                        template.id
                      }
                    />
                  ),
                )}
              </div>
            )}
          </>
        )}

        {/* LIBRARY */}
        {view === "library" && (
          <>
            {libraryLoading ? (
              <TemplatesSkeleton />
            ) : library.length ===
              0 ? (
              <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/40 text-center">
                <div>
                  <BookOpen className="mx-auto h-6 w-6 text-slate-300" />

                  <p className="mt-3 text-sm font-medium text-slate-600">
                    Biblioteca vacía
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Todavía no hay plantillas disponibles.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {library.map(
                  (item) => (
                    <LibraryCard
                      key={
                        item.id
                      }
                      item={
                        item
                      }
                      onUse={
                        openFromLibrary
                      }
                    />
                  ),
                )}
              </div>
            )}
          </>
        )}
      </div>

      <TemplateFormSheet
        workspaceId={
          workspaceId
        }
        template={
          editingTemplate
        }
        prefill={prefill}
        open={sheetOpen}
        onOpenChange={
          setSheetOpen
        }
        onSaved={
          fetchTemplates
        }
      />
    </>
  );
}