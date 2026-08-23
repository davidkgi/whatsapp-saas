"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  MessageSquareText,
  Send,
} from "lucide-react";

import { toast } from "sonner";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import {
  getApprovedTemplates,
  sendTemplateAction,
} from "../services/template-actions";

import type { TemplateRow } from "../services/templates";

interface TemplatePickerProps {
  conversationId: string;
  workspaceId: string;
  onSent?: () => void;
}

function extractVariableCount(
  body: string,
): number {
  const matches =
    body.matchAll(/\{\{(\d+)\}\}/g);

  const seen = new Set<string>();

  for (const match of matches) {
    if (match[1]) {
      seen.add(match[1]);
    }
  }

  return seen.size;
}

function fillPreview(
  body: string,
  variables: string[],
): string {
  let result = body;

  variables.forEach(
    (value, index) => {
      result = result.replaceAll(
        `{{${index + 1}}}`,
        value || "...",
      );
    },
  );

  return result;
}

export function TemplatePicker({
  conversationId,
  workspaceId,
  onSent,
}: TemplatePickerProps) {
  const [templates, setTemplates] =
    useState<TemplateRow[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    selectedTemplate,
    setSelectedTemplate,
  ] = useState<TemplateRow | null>(
    null,
  );

  const [variables, setVariables] =
    useState<string[]>([]);

  const [isPending, setIsPending] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    getApprovedTemplates(
      workspaceId,
    )
      .then((rows) => {
        if (!cancelled) {
          setTemplates(rows);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTemplates([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  function handleSelectTemplate(
    template: TemplateRow,
  ) {
    const count =
      extractVariableCount(
        template.body_template,
      );

    setSelectedTemplate(template);

    setVariables(
      Array.from(
        { length: count },
        () => "",
      ),
    );
  }

  function handleBack() {
    setSelectedTemplate(null);
    setVariables([]);
  }

  function handleVariableChange(
    index: number,
    value: string,
  ) {
    setVariables((previous) => {
      const next = [...previous];

      next[index] = value;

      return next;
    });
  }

  async function handleSend() {
    if (!selectedTemplate) {
      return;
    }

    setIsPending(true);

    try {
      const result =
        await sendTemplateAction(
          workspaceId,
          conversationId,
          selectedTemplate.name,
          selectedTemplate.language,
          variables,
        );

      if (result.ok) {
        toast.success(
          "Template enviado",
        );

        setSelectedTemplate(null);
        setVariables([]);

        onSent?.();
      } else {
        toast.error(
          result.error ??
            "Error al enviar el template",
        );
      }
    } catch {
      toast.error(
        "Error inesperado al enviar el template",
      );
    } finally {
      setIsPending(false);
    }
  }

  /* ================================ */
  /* LOADING                          */
  /* ================================ */

  if (isLoading) {
    return (
      <div
        className="flex items-center gap-2 px-2 py-1"
        aria-busy="true"
        aria-label="Cargando templates"
      >
        <Skeleton className="h-9 flex-1 rounded-xl" />
      </div>
    );
  }

  /* ================================ */
  /* EMPTY                            */
  /* ================================ */

  if (templates.length === 0) {
    return (
      <div className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-2">
        <MessageSquareText className="h-4 w-4 shrink-0 text-slate-400" />

        <p className="text-xs text-slate-500">
          No hay plantillas aprobadas disponibles
        </p>
      </div>
    );
  }

  /* ================================ */
  /* TEMPLATE SELECCIONADO            */
  /* ================================ */

  if (selectedTemplate) {
    const preview = fillPreview(
      selectedTemplate.body_template,
      variables,
    );

    return (
      <div className="space-y-3 rounded-2xl border bg-white p-3 shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleBack}
            aria-label="Volver a lista de templates"
            className="h-8 w-8 shrink-0 rounded-lg"
          >
            <ArrowLeft
              className="h-4 w-4"
              aria-hidden="true"
            />
          </Button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {selectedTemplate.name}
            </p>

            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
              Plantilla aprobada
            </p>
          </div>

          <Badge
            variant="outline"
            className="shrink-0 rounded-full text-[10px]"
          >
            {selectedTemplate.language}
          </Badge>
        </div>

        {/* Preview */}
        <div className="whitespace-pre-wrap rounded-xl border bg-slate-50 px-3 py-3 text-sm leading-relaxed text-slate-600">
          {preview}
        </div>

        {/* Variables */}
        {variables.length > 0 && (
          <div className="grid gap-2">
            {variables.map(
              (value, index) => (
                <div
                  key={index}
                  className="space-y-1"
                >
                  <Label
                    htmlFor={`tpl-var-${index}`}
                    className="text-[11px] text-slate-500"
                  >
                    Variable{" "}
                    {`{{${index + 1}}}`}
                  </Label>

                  <Input
                    id={`tpl-var-${index}`}
                    value={value}
                    onChange={(event) =>
                      handleVariableChange(
                        index,
                        event.target.value,
                      )
                    }
                    placeholder="Valor..."
                    className="h-9 rounded-lg text-sm"
                    disabled={isPending}
                  />
                </div>
              ),
            )}
          </div>
        )}

        {/* Enviar */}
        <Button
          type="button"
          onClick={handleSend}
          disabled={isPending}
          aria-busy={isPending}
          className="h-10 w-full rounded-xl bg-[#071b3b] text-xs text-white hover:bg-[#0b2a59]"
        >
          <Send
            className="mr-2 h-4 w-4"
            aria-hidden="true"
          />

          {isPending
            ? "Enviando..."
            : "Enviar plantilla"}
        </Button>
      </div>
    );
  }

  /* ================================ */
  /* LISTA DE TEMPLATES               */
  /* ================================ */

  return (
    <div className="rounded-2xl border bg-white p-2">
      <div className="mb-2 flex items-center justify-between px-1">
        <div>
          <p className="text-xs font-medium text-slate-700">
            Enviar plantilla
          </p>

          <p className="mt-0.5 text-[10px] text-slate-400">
            Ventana de 24 horas cerrada
          </p>
        </div>

        <Badge
          variant="secondary"
          className="rounded-full text-[10px]"
        >
          {templates.length}
        </Badge>
      </div>

      <ScrollArea className="max-h-44">
        <div className="space-y-1">
          {templates.map(
            (template) => (
              <button
                key={template.id}
                type="button"
                onClick={() =>
                  handleSelectTemplate(
                    template,
                  )
                }
                className={cn(
                  "w-full rounded-xl border border-transparent px-3 py-2.5 text-left transition-all",
                  "hover:border-slate-200 hover:bg-slate-50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300",
                )}
              >
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-700">
                      {template.name}
                    </p>

                    <p className="mt-0.5 text-[10px] text-slate-400">
                      Plantilla aprobada
                    </p>
                  </div>

                  <Badge
                    variant="outline"
                    className="shrink-0 rounded-full text-[9px]"
                  >
                    {template.language}
                  </Badge>
                </div>
              </button>
            ),
          )}
        </div>
      </ScrollArea>
    </div>
  );
}