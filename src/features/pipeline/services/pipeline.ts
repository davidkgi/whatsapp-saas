// ──────────────────────────────────────────────────────────────────────────────
// Pipeline services — dynamic pipelines + stages per workspace.
// Uses the service-role client (same approach as dashboard metrics) and scopes
// every query explicitly by workspace_id. When an ownerId is passed (agents),
// results are restricted to that owner's contacts.
// ──────────────────────────────────────────────────────────────────────────────

import { createClient as createSbClient } from "@supabase/supabase-js";
import type {
  PipelineCard,
  PipelineStageDef,
  PipelineSummary,
} from "@/features/pipeline/stages";

function svc() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ── Pipelines of a workspace (ordered; default first) ─────────────────────────
export async function getPipelines(
  workspaceId: string,
): Promise<PipelineSummary[]> {
  const supabase = svc();
  const { data } = await supabase
    .from("pipelines")
    .select("id, name, is_default, position")
    .eq("workspace_id", workspaceId)
    .order("is_default", { ascending: false })
    .order("position", { ascending: true });

  return ((data ?? []) as Array<{
    id: string;
    name: string;
    is_default: boolean;
    position: number;
  }>).map((p) => ({
    id: p.id,
    name: p.name,
    isDefault: p.is_default,
    position: p.position,
  }));
}

// ── Stage columns of a given pipeline (ordered) ───────────────────────────────
export async function getPipelineStages(
  workspaceId: string,
  pipelineId: string,
): Promise<PipelineStageDef[]> {
  const supabase = svc();
  const { data } = await supabase
    .from("pipeline_stages")
    .select("key, label, color, position, is_won, is_lost")
    .eq("workspace_id", workspaceId)
    .eq("pipeline_id", pipelineId)
    .order("position", { ascending: true });

  return ((data ?? []) as Array<{
    key: string;
    label: string;
    color: string;
    position: number;
    is_won: boolean;
    is_lost: boolean;
  }>).map((s) => ({
    key: s.key,
    label: s.label,
    color: s.color,
    position: s.position,
    isWon: s.is_won,
    isLost: s.is_lost,
  }));
}

interface ContactRow {
  id: string;
  name: string | null;
  phone: string;
  stage: string;
  source: string | null;
  custom_fields: Record<string, unknown> | null;
  created_at: string;
}

// ── Cards (contacts) of a pipeline ────────────────────────────────────────────
// includeNull: when true (the default pipeline), also pulls contacts whose
// pipeline_id is still NULL (e.g. brand-new leads created by the webhook), so
// they always show up somewhere instead of disappearing.
export async function getPipelineCards(
  workspaceId: string,
  pipelineId: string,
  opts?: { ownerId?: string | null; includeNull?: boolean },
): Promise<PipelineCard[]> {
  const supabase = svc();

  let query = supabase
    .from("contacts")
    .select("id, name, phone, stage, source, custom_fields, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (opts?.includeNull) {
    query = query.or(`pipeline_id.eq.${pipelineId},pipeline_id.is.null`);
  } else {
    query = query.eq("pipeline_id", pipelineId);
  }

  if (opts?.ownerId) {
    query = query.eq("owner_id", opts.ownerId);
  }

  const { data } = await query;
  const rows = (data ?? []) as ContactRow[];

  const { data: convs } = await supabase
    .from("conversations")
    .select("id, contact_id")
    .eq("workspace_id", workspaceId);

  const convByContact = new Map<string, string>();
  for (const c of (convs ?? []) as Array<{ id: string; contact_id: string }>) {
    if (!convByContact.has(c.contact_id)) convByContact.set(c.contact_id, c.id);
  }

  return rows.map((r) => {
    const cf = r.custom_fields ?? {};
    return {
      id: r.id,
      name: r.name,
      phone: r.phone,
      stage: r.stage,
      source: r.source,
      modelo:
        typeof cf.modelo_interes === "string" ? cf.modelo_interes : null,
      presupuesto:
        typeof cf.presupuesto === "string" ? cf.presupuesto : null,
      createdAt: r.created_at,
      conversationId: convByContact.get(r.id) ?? null,
    };
  });
}

// ── Validate a stage key exists in the workspace (any pipeline) ───────────────
export async function stageExistsInWorkspace(
  workspaceId: string,
  stage: string,
): Promise<boolean> {
  const supabase = svc();
  const { data } = await supabase
    .from("pipeline_stages")
    .select("key")
    .eq("workspace_id", workspaceId)
    .eq("key", stage)
    .limit(1)
    .maybeSingle();
  return !!data;
}

// ── Move a contact to a stage (and attach it to the pipeline if it was NULL) ──
export async function updateContactStage(
  workspaceId: string,
  contactId: string,
  stage: string,
  pipelineId?: string | null,
): Promise<boolean> {
  const supabase = svc();

  const update: Record<string, unknown> = { stage };
  if (pipelineId) update.pipeline_id = pipelineId;

  const { error } = await supabase
    .from("contacts")
    .update(update)
    .eq("id", contactId)
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("[pipeline] updateContactStage error:", error.message);
    return false;
  }
  return true;
}

// ── Stages for a workspace's default pipeline (used by the inbox CRM panel) ───
export async function getDefaultPipelineStages(
  workspaceId: string,
): Promise<PipelineStageDef[]> {
  const pipelines = await getPipelines(workspaceId);
  const target = pipelines.find((p) => p.isDefault) ?? pipelines[0];
  if (!target) return [];
  return getPipelineStages(workspaceId, target.id);
}
