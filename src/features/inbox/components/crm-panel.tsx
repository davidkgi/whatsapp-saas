"use client";

import {
  KeyboardEvent,
  useState,
  useTransition,
} from "react";

import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  RefreshCw,
  Save,
  Tag,
  User,
  X,
} from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  updateContact,
  syncContactHL,
} from "../services/contact-actions";

import type { ContactRow } from "@/features/inbox/types";

type Stage =
  | "new"
  | "engaged"
  | "qualified"
  | "customer"
  | "lost";

const STAGE_LABELS: Record<Stage, string> = {
  new: "Nuevo",
  engaged: "Interesado",
  qualified: "Calificado",
  customer: "Cliente",
  lost: "Perdido",
};

interface CrmPanelProps {
  contact: ContactRow;
  conversationId: string;
}

function Initials({
  name,
  phone,
}: {
  name: string | null;
  phone: string;
}) {
  const letters = name?.trim()
    ? name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(
          (word) =>
            word[0]?.toUpperCase() ?? "",
        )
        .join("")
    : phone.slice(-2);

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
      {letters}
    </div>
  );
}

function SectionHeader({
  title,
  open,
  onClick,
}: {
  title: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-slate-50"
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {title}
      </span>

      {open ? (
        <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
      ) : (
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      )}
    </button>
  );
}

export function CrmPanel({
  contact,
  conversationId: _conversationId,
}: CrmPanelProps) {
  const [isPending, startTransition] =
    useTransition();

  const [name, setName] = useState(
    contact.name ?? "",
  );

  const [email, setEmail] = useState(
    contact.email ?? "",
  );

  const [stage, setStage] =
    useState<Stage>(
      (contact.stage as Stage | null) ??
        "new",
    );

  const [tags, setTags] = useState<
    string[]
  >(contact.tags ?? []);

  const [tagInput, setTagInput] =
    useState("");

  const [optIn, setOptIn] = useState(
    contact.opt_in,
  );

  const [contactOpen, setContactOpen] =
    useState(true);

  const [crmOpen, setCrmOpen] =
    useState(true);

  function addTag() {
    const trimmed = tagInput.trim();

    if (
      trimmed &&
      !tags.includes(trimmed)
    ) {
      setTags((previous) => [
        ...previous,
        trimmed,
      ]);
    }

    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags((previous) =>
      previous.filter(
        (item) => item !== tag,
      ),
    );
  }

  function handleTagKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    }
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateContact(
        contact.id,
        {
          name: name || undefined,
          email: email || undefined,
          stage,
          tags,
          opt_in: optIn,
        },
      );

      if (result.ok) {
        toast.success(
          "Contacto actualizado",
        );
      } else {
        toast.error(
          result.error ??
            "Error al guardar",
        );
      }
    });
  }

  function handleSyncHL() {
    startTransition(async () => {
      const result = await syncContactHL(
        contact.id,
        contact.workspace_id,
      );

      if (result.ok) {
        toast.success(
          "Contacto sincronizado con HighLevel",
        );
      } else {
        toast.error(
          result.error ??
            "Error al sincronizar",
        );
      }
    });
  }

  return (
    <aside className="flex h-full w-full flex-col bg-white text-sm">
      {/* CONTENIDO SCROLLABLE */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* RESUMEN */}
        <div className="border-b px-4 py-4">
          <div className="flex items-center gap-3">
            <Initials
              name={name || contact.name}
              phone={contact.phone}
            />

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-slate-900">
                {name ||
                  contact.name ||
                  "Contacto sin nombre"}
              </h3>

              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                <Phone className="h-3 w-3" />
                <span className="truncate">
                  {contact.phone}
                </span>
              </div>

              {email && (
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">
                    {email}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Estado rápido */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border bg-slate-50 px-2.5 py-2">
              <p className="text-[9px] uppercase tracking-wide text-slate-400">
                Etapa
              </p>

              <p className="mt-0.5 truncate text-[11px] font-medium text-slate-700">
                {STAGE_LABELS[stage]}
              </p>
            </div>

            <div className="rounded-lg border bg-slate-50 px-2.5 py-2">
              <p className="text-[9px] uppercase tracking-wide text-slate-400">
                WhatsApp
              </p>

              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className={
                    optIn
                      ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
                      : "h-1.5 w-1.5 rounded-full bg-red-400"
                  }
                />

                <p className="truncate text-[11px] font-medium text-slate-700">
                  {optIn
                    ? "Opt-in activo"
                    : "Opt-out"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* INFORMACIÓN DEL CONTACTO */}
        <section className="border-b">
          <SectionHeader
            title="Información del contacto"
            open={contactOpen}
            onClick={() =>
              setContactOpen(
                (value) => !value,
              )
            }
          />

          {contactOpen && (
            <div className="space-y-3 px-4 pb-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-slate-500">
                  Nombre
                </Label>

                <Input
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value,
                    )
                  }
                  placeholder="Sin nombre"
                  className="h-8 rounded-lg bg-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-slate-500">
                  Email
                </Label>

                <Input
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  placeholder="email@ejemplo.com"
                  type="email"
                  className="h-8 rounded-lg bg-white text-xs"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2.5">
                <div className="min-w-0 pr-3">
                  <p className="text-[11px] font-medium text-slate-700">
                    WhatsApp Opt-in
                  </p>

                  <p className="mt-0.5 truncate text-[9px] text-slate-400">
                    Permite enviar mensajes
                  </p>
                </div>

                <Switch
                  checked={optIn}
                  onCheckedChange={setOptIn}
                  aria-label="WhatsApp Opt-in"
                />
              </div>
            </div>
          )}
        </section>

        {/* INFORMACIÓN COMERCIAL */}
        <section className="border-b">
          <SectionHeader
            title="Información comercial"
            open={crmOpen}
            onClick={() =>
              setCrmOpen(
                (value) => !value,
              )
            }
          />

          {crmOpen && (
            <div className="space-y-3 px-4 pb-4">
              {/* Etapa */}
              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-slate-500">
                  Etapa
                </Label>

                <Select
                  value={stage}
                  onValueChange={(value) =>
                    setStage(
                      value as Stage,
                    )
                  }
                >
                  <SelectTrigger className="h-8 rounded-lg text-xs">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {(
                      Object.keys(
                        STAGE_LABELS,
                      ) as Stage[]
                    ).map(
                      (stageKey) => (
                        <SelectItem
                          key={stageKey}
                          value={stageKey}
                          className="text-xs"
                        >
                          {
                            STAGE_LABELS[
                              stageKey
                            ]
                          }
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Etiquetas */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Tag className="h-3 w-3 text-slate-400" />

                  <Label className="text-[10px] font-medium text-slate-500">
                    Etiquetas
                  </Label>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-medium text-slate-600"
                      >
                        {tag}

                        <button
                          type="button"
                          onClick={() =>
                            removeTag(tag)
                          }
                          aria-label={`Eliminar etiqueta ${tag}`}
                          className="ml-0.5 text-slate-400 hover:text-red-500"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <Input
                  value={tagInput}
                  onChange={(event) =>
                    setTagInput(
                      event.target.value,
                    )
                  }
                  onKeyDown={
                    handleTagKeyDown
                  }
                  onBlur={addTag}
                  placeholder="Agregar etiqueta..."
                  className="h-8 rounded-lg text-xs"
                />
              </div>
            </div>
          )}
        </section>

        {/* PRÓXIMA ACCIÓN */}
        <section className="px-4 py-3">
          <div className="rounded-lg border border-dashed border-violet-200 bg-violet-50/50 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-violet-500" />

              <p className="text-[11px] font-medium text-violet-700">
                Próxima acción
              </p>
            </div>

            <p className="mt-1.5 text-[10px] leading-relaxed text-violet-600/70">
              El plan de trabajo aparecerá aquí cuando activemos este módulo.
            </p>
          </div>
        </section>

        {!optIn && (
          <div className="mx-4 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-[10px] leading-relaxed text-red-600">
              <strong>
                Opt-out activo.
              </strong>{" "}
              Este contacto no debe recibir mensajes.
            </p>
          </div>
        )}
      </div>

      {/* ACCIONES FIJAS */}
      <div className="shrink-0 space-y-2 border-t bg-white px-4 py-3">
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="h-9 w-full rounded-lg bg-[#071b3b] text-[11px] font-medium text-white hover:bg-[#0b2a59]"
        >
          <Save className="mr-2 h-3.5 w-3.5" />

          {isPending
            ? "Guardando..."
            : "Guardar cambios"}
        </Button>

        <Button
          variant="outline"
          onClick={handleSyncHL}
          disabled={isPending}
          className="h-9 w-full rounded-lg text-[11px]"
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" />

          Sincronizar HighLevel
        </Button>
      </div>
    </aside>
  );
}

export { User };