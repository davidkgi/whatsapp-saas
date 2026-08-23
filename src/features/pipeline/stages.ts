// ──────────────────────────────────────────────────────────────────────────────
// Pipeline types — pure, no server imports, safe for client and server.
// Stages are now DYNAMIC (they live in the `pipeline_stages` table per
// workspace/pipeline), so there are no hardcoded stage constants here anymore.
// ──────────────────────────────────────────────────────────────────────────────

export interface PipelineStageDef {
  key: string; // value stored in contacts.stage and used by the n8n agent
  label: string; // shown in the Kanban column header
  color: string;
  position: number;
  isWon: boolean;
  isLost: boolean;
}

export interface PipelineSummary {
  id: string;
  name: string;
  isDefault: boolean;
  position: number;
}

export interface PipelineCard {
  id: string;
  name: string | null;
  phone: string;
  stage: string; // one of the pipeline's stage keys
  source: string | null;
  modelo: string | null;
  presupuesto: string | null;
  createdAt: string;
  conversationId: string | null;
}

// Human label for a stage key, falling back to a prettified version of the key.
export function labelForStage(
  stages: PipelineStageDef[],
  key: string | null | undefined,
): string {
  if (!key) return "Sin etapa";
  const found = stages.find((s) => s.key === key);
  if (found) return found.label;
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
}
