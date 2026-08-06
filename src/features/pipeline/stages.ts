// ──────────────────────────────────────────────────────────────────────────────
// Pipeline stages for the dealership Kanban. Pure constants + types (no server
// imports) so both the client board and the server services can use them.
// These ids MUST match the values added to the `contact_stage` enum.
// ──────────────────────────────────────────────────────────────────────────────

export const PIPELINE_STAGES = [
  { id: "nuevo", label: "Nuevo", color: "#64748b" },
  { id: "contactado", label: "Contactado", color: "#6366f1" },
  { id: "calificado", label: "Calificado", color: "#2563eb" },
  { id: "cotizacion", label: "Cotización", color: "#06b6d4" },
  { id: "test_drive", label: "Test Drive", color: "#0ea5e9" },
  { id: "negociacion", label: "Negociación", color: "#f59e0b" },
  { id: "ganado", label: "Ganado", color: "#10b981" },
  { id: "perdido", label: "Perdido", color: "#94a3b8" },
] as const;

export type PipelineStageId = (typeof PIPELINE_STAGES)[number]["id"];

export const PIPELINE_STAGE_IDS: PipelineStageId[] = PIPELINE_STAGES.map(
  (s) => s.id,
);

// Legacy enum values (from the original setter) → dealership stages, so no
// existing contact ever disappears from the board.
const LEGACY_MAP: Record<string, PipelineStageId> = {
  new: "nuevo",
  engaged: "contactado",
  qualified: "calificado",
  customer: "ganado",
  lost: "perdido",
};

export function normalizeStage(raw: string): PipelineStageId {
  if (PIPELINE_STAGE_IDS.includes(raw as PipelineStageId)) {
    return raw as PipelineStageId;
  }
  return LEGACY_MAP[raw] ?? "nuevo";
}

export function isValidStage(raw: string): raw is PipelineStageId {
  return PIPELINE_STAGE_IDS.includes(raw as PipelineStageId);
}

export interface PipelineCard {
  id: string;
  name: string | null;
  phone: string;
  stage: PipelineStageId;
  source: string | null;
  modelo: string | null;
  presupuesto: string | null;
  createdAt: string;
}
