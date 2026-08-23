"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  PipelineCard,
  PipelineStageDef,
  PipelineSummary,
} from "@/features/pipeline/stages";
import { cn } from "@/lib/utils";
import { Phone, GripVertical } from "lucide-react";

export function PipelineBoard({
  stages,
  pipelines,
  activePipelineId,
  initialCards,
}: {
  stages: PipelineStageDef[];
  pipelines: PipelineSummary[];
  activePipelineId: string;
  initialCards: PipelineCard[];
}) {
  const router = useRouter();
  const [cards, setCards] = useState<PipelineCard[]>(initialCards);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const stageKeys = useMemo(() => new Set(stages.map((s) => s.key)), [stages]);
  const firstStageKey = stages[0]?.key ?? "";

  // Group cards by stage. Any card whose stage isn't a column (orphan) lands in
  // the first column so it's never lost.
  const byStage = useMemo(() => {
    const map = new Map<string, PipelineCard[]>();
    for (const s of stages) map.set(s.key, []);
    for (const c of cards) {
      const key = stageKeys.has(c.stage) ? c.stage : firstStageKey;
      map.get(key)?.push(c);
    }
    return map;
  }, [cards, stages, stageKeys, firstStageKey]);

  async function move(contactId: string, toStage: string) {
    const current = cards.find((c) => c.id === contactId);
    if (!current || current.stage === toStage) return;

    const prevStage = current.stage;
    setCards((cs) =>
      cs.map((c) => (c.id === contactId ? { ...c, stage: toStage } : c)),
    );
    setSavingId(contactId);

    try {
      const res = await fetch("/api/pipeline/stage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          stage: toStage,
          pipelineId: activePipelineId,
        }),
      });
      if (!res.ok) throw new Error("failed");
    } catch {
      setCards((cs) =>
        cs.map((c) => (c.id === contactId ? { ...c, stage: prevStage } : c)),
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="p-3 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">
            Pipeline
          </h1>
          <p className="text-sm text-muted-foreground">
            Arrastra cada lead a su etapa, o cámbiala desde la tarjeta.
          </p>
        </div>

        {pipelines.length > 1 && (
          <select
            value={activePipelineId}
            onChange={(e) => router.push(`/pipeline?pipeline=${e.target.value}`)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium"
            aria-label="Seleccionar pipeline"
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {stages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 py-16 text-center text-sm text-muted-foreground">
          Este pipeline no tiene etapas configuradas todavía.
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const items = byStage.get(stage.key) ?? [];
            const isOver = overStage === stage.key;
            return (
              <div
                key={stage.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverStage(stage.key);
                }}
                onDragLeave={() =>
                  setOverStage((s) => (s === stage.key ? null : s))
                }
                onDrop={() => {
                  if (dragId) move(dragId, stage.key);
                  setDragId(null);
                  setOverStage(null);
                }}
                className={cn(
                  "w-[230px] shrink-0 rounded-xl border border-border/60 bg-muted/30 p-2 transition-colors",
                  isOver && "border-primary/60 bg-primary/5",
                )}
              >
                <div className="flex items-center gap-2 px-1 py-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: stage.color }}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium">{stage.label}</span>
                  <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
                    {items.length}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {items.map((card) => (
                    <article
                      key={card.id}
                      draggable
                      onDragStart={() => setDragId(card.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverStage(null);
                      }}
                      className={cn(
                        "group rounded-lg border border-border bg-card p-2.5 shadow-sm cursor-grab active:cursor-grabbing",
                        savingId === card.id && "opacity-60",
                      )}
                    >
                      <div className="flex items-start gap-1.5">
                        <GripVertical
                          className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <div
                          className={cn(
                            "min-w-0 flex-1",
                            card.conversationId && "cursor-pointer group/open",
                          )}
                          onClick={() => {
                            if (card.conversationId) {
                              router.push(`/inbox/${card.conversationId}`);
                            }
                          }}
                          title={
                            card.conversationId ? "Abrir conversación" : undefined
                          }
                        >
                          <p
                            className={cn(
                              "text-sm font-medium truncate",
                              card.conversationId &&
                                "group-hover/open:text-primary group-hover/open:underline",
                            )}
                          >
                            {card.name || "Sin nombre"}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                            <Phone
                              className="h-3 w-3 shrink-0"
                              aria-hidden="true"
                            />
                            {card.phone}
                          </p>
                        </div>
                      </div>

                      {(card.modelo || card.presupuesto || card.source) && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {card.modelo && <Chip>{card.modelo}</Chip>}
                          {card.presupuesto && <Chip>{card.presupuesto}</Chip>}
                          {card.source && <Chip muted>{card.source}</Chip>}
                        </div>
                      )}

                      <select
                        value={stageKeys.has(card.stage) ? card.stage : firstStageKey}
                        onChange={(e) => move(card.id, e.target.value)}
                        className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                        aria-label="Cambiar etapa"
                      >
                        {stages.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </article>
                  ))}

                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border/60 py-6 text-center text-xs text-muted-foreground/60">
                      —
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chip({
  children,
  muted,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        muted ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
      )}
    >
      {children}
    </span>
  );
}
