"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  GripVertical,
  MessageCircle,
  MoreHorizontal,
  Phone,
} from "lucide-react";

import {
  PIPELINE_STAGES,
  type PipelineCard,
  type PipelineStageId,
} from "@/features/pipeline/stages";

import { cn } from "@/lib/utils";

export function PipelineBoard({
  initialCards,
}: {
  initialCards: PipelineCard[];
}) {
  const router = useRouter();

  const [cards, setCards] =
    useState<PipelineCard[]>(initialCards);

  const [dragId, setDragId] =
    useState<string | null>(null);

  const [overStage, setOverStage] =
    useState<PipelineStageId | null>(null);

  const [savingId, setSavingId] =
    useState<string | null>(null);

  const byStage = useMemo(() => {
    const map = new Map<
      PipelineStageId,
      PipelineCard[]
    >();

    for (const stage of PIPELINE_STAGES) {
      map.set(stage.id, []);
    }

    for (const card of cards) {
      map.get(card.stage)?.push(card);
    }

    return map;
  }, [cards]);

  async function move(
    contactId: string,
    toStage: PipelineStageId,
  ) {
    const current = cards.find(
      (card) => card.id === contactId,
    );

    if (
      !current ||
      current.stage === toStage
    ) {
      return;
    }

    const previousStage = current.stage;

    setCards((currentCards) =>
      currentCards.map((card) =>
        card.id === contactId
          ? {
              ...card,
              stage: toStage,
            }
          : card,
      ),
    );

    setSavingId(contactId);

    try {
      const res = await fetch(
        "/api/pipeline/stage",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            contactId,
            stage: toStage,
          }),
        },
      );

      if (!res.ok) {
        throw new Error("failed");
      }
    } catch {
      setCards((currentCards) =>
        currentCards.map((card) =>
          card.id === contactId
            ? {
                ...card,
                stage: previousStage,
              }
            : card,
        ),
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f7f8fb]">
      {/* HEADER */}
      <header className="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Pipeline
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Gestiona el avance comercial de tus leads.
            </p>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Oportunidades
              </p>

              <p className="mt-0.5 text-base font-semibold text-slate-800">
                {cards.length}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* BOARD */}
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex min-h-full min-w-max gap-3 p-4">
          {PIPELINE_STAGES.map(
            (stage) => {
              const items =
                byStage.get(stage.id) ?? [];

              const isOver =
                overStage === stage.id;

              return (
                <section
                  key={stage.id}
                  onDragOver={(event) => {
                    event.preventDefault();

                    setOverStage(
                      stage.id,
                    );
                  }}
                  onDragLeave={() =>
                    setOverStage(
                      (currentStage) =>
                        currentStage ===
                        stage.id
                          ? null
                          : currentStage,
                    )
                  }
                  onDrop={() => {
                    if (dragId) {
                      void move(
                        dragId,
                        stage.id,
                      );
                    }

                    setDragId(null);
                    setOverStage(null);
                  }}
                  className={cn(
                    "flex min-h-[calc(100vh-180px)] w-[270px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#f2f4f7] transition-all",
                    isOver &&
                      "border-violet-300 bg-violet-50/60 ring-2 ring-violet-100",
                  )}
                >
                  {/* HEADER DE ETAPA */}
                  <div className="shrink-0 bg-white px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            stage.color,
                        }}
                      />

                      <h2 className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                        {stage.label}
                      </h2>

                      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold tabular-nums text-slate-500">
                        {items.length}
                      </span>

                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        aria-label={`Opciones de ${stage.label}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="h-px bg-slate-200" />

                  {/* CARDS */}
                  <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2.5">
                    {items.map((card) => {
                      const initials =
                        getInitials(
                          card.name,
                          card.phone,
                        );

                      return (
                        <article
                          key={card.id}
                          draggable
                          onDragStart={() =>
                            setDragId(
                              card.id,
                            )
                          }
                          onDragEnd={() => {
                            setDragId(null);
                            setOverStage(
                              null,
                            );
                          }}
                          className={cn(
                            "group rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-150",
                            "cursor-grab hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:cursor-grabbing",
                            dragId ===
                              card.id &&
                              "scale-[0.98] opacity-60",
                            savingId ===
                              card.id &&
                              "pointer-events-none opacity-50",
                          )}
                        >
                          {/* CABECERA DEL LEAD */}
                          <div className="flex items-start gap-2.5">
                            <GripVertical
                              className="mt-1 h-4 w-4 shrink-0 text-slate-200 transition-colors group-hover:text-slate-400"
                              aria-hidden="true"
                            />

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-[10px] font-semibold text-violet-700">
                              {initials}
                            </div>

                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                disabled={
                                  !card.conversationId
                                }
                                onClick={() => {
                                  if (
                                    card.conversationId
                                  ) {
                                    router.push(
                                      `/inbox/${card.conversationId}`,
                                    );
                                  }
                                }}
                                className={cn(
                                  "block w-full text-left",
                                  card.conversationId &&
                                    "cursor-pointer",
                                )}
                              >
                                <p
                                  className={cn(
                                    "truncate text-sm font-semibold text-slate-800",
                                    card.conversationId &&
                                      "transition-colors hover:text-violet-700",
                                  )}
                                >
                                  {card.name ||
                                    "Sin nombre"}
                                </p>

                                <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                                  <Phone className="h-3 w-3 shrink-0" />

                                  <span className="truncate">
                                    {card.phone}
                                  </span>
                                </div>
                              </button>
                            </div>

                            {card.conversationId && (
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/inbox/${card.conversationId}`,
                                  )
                                }
                                aria-label="Abrir conversación"
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-violet-50 hover:text-violet-600"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          {/* INFORMACIÓN COMERCIAL */}
                          {(card.modelo ||
                            card.presupuesto ||
                            card.source) && (
                            <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5">
                              {card.modelo && (
                                <InfoRow
                                  label="Modelo"
                                  value={
                                    card.modelo
                                  }
                                />
                              )}

                              {card.presupuesto && (
                                <InfoRow
                                  label="Presupuesto"
                                  value={
                                    card.presupuesto
                                  }
                                />
                              )}

                              {card.source && (
                                <InfoRow
                                  label="Origen"
                                  value={
                                    card.source
                                  }
                                  muted
                                />
                              )}
                            </div>
                          )}

                          {/* CAMBIO DE ETAPA */}
                          <div className="mt-3 border-t border-slate-100 pt-2.5">
                            <div className="mb-1.5 flex items-center justify-between">
                              <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-slate-400">
                                Etapa
                              </span>

                              {savingId ===
                                card.id && (
                                <span className="text-[9px] text-slate-400">
                                  Guardando...
                                </span>
                              )}
                            </div>

                            <select
                              value={
                                card.stage
                              }
                              onChange={(
                                event,
                              ) =>
                                void move(
                                  card.id,
                                  event.target
                                    .value as PipelineStageId,
                                )
                              }
                              className="h-8 w-full cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] text-slate-600 outline-none transition-all hover:border-slate-300 focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                              aria-label="Cambiar etapa"
                            >
                              {PIPELINE_STAGES.map(
                                (
                                  stageOption,
                                ) => (
                                  <option
                                    key={
                                      stageOption.id
                                    }
                                    value={
                                      stageOption.id
                                    }
                                  >
                                    {
                                      stageOption.label
                                    }
                                  </option>
                                ),
                              )}
                            </select>
                          </div>
                        </article>
                      );
                    })}

                    {/* VACÍO */}
                    {items.length === 0 && (
                      <div className="flex min-h-[130px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/40 px-5 text-center">
                        <div>
                          <div
                            className="mx-auto mb-2 h-2 w-2 rounded-full opacity-50"
                            style={{
                              backgroundColor:
                                stage.color,
                            }}
                          />

                          <p className="text-[11px] font-medium text-slate-400">
                            Sin oportunidades
                          </p>

                          <p className="mt-1 text-[10px] leading-relaxed text-slate-300">
                            Arrastra aquí un lead
                            para cambiarlo de
                            etapa.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}

function getInitials(
  name: string | null,
  phone: string,
) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return name
      .trim()
      .slice(0, 2)
      .toUpperCase();
  }

  return phone.slice(-2);
}

function InfoRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-[9px] uppercase tracking-[0.07em] text-slate-400">
        {label}
      </span>

      <span
        className={cn(
          "min-w-0 truncate text-right text-[10px] font-medium",
          muted
            ? "text-slate-400"
            : "text-slate-600",
        )}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}