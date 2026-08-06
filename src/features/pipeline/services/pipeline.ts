// ──────────────────────────────────────────────────────────────────────────────
// Pipeline services — reads/writes contacts for the dealership Kanban.
// Uses the service-role client (same approach as dashboard metrics) and scopes
// every query explicitly by workspace_id. When an ownerId is passed (agents),
// results are further restricted to that owner's contacts.
// ──────────────────────────────────────────────────────────────────────────────

import { createClient as createSbClient } from "@supabase/supabase-js";
import {
  normalizeStage,
  type PipelineCard,
  type PipelineStageId,
} from "@/features/pipeline/stages";

function svc() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
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

export async function getPipelineCards(
  workspaceId: string,
  opts?: { ownerId?: string | null },
): Promise<PipelineCard[]> {
  const supabase = svc();

  let query = supabase
    .from("contacts")
    .select("id, name, phone, stage, source, custom_fields, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (opts?.ownerId) {
    query = query.eq("owner_id", opts.ownerId);
  }

  const { data } = await query;
  const rows = (data ?? []) as ContactRow[];

  return rows.map((r) => {
    const cf = r.custom_fields ?? {};
    return {
      id: r.id,
      name: r.name,
      phone: r.phone,
      stage: normalizeStage(r.stage),
      source: r.source,
      modelo:
        typeof cf.modelo_interes === "string" ? cf.modelo_interes : null,
      presupuesto:
        typeof cf.presupuesto === "string" ? cf.presupuesto : null,
      createdAt: r.created_at,
    };
  });
}

export async function updateContactStage(
  workspaceId: string,
  contactId: string,
  stage: PipelineStageId,
): Promise<boolean> {
  const supabase = svc();
  const { error } = await supabase
    .from("contacts")
    .update({ stage })
    .eq("id", contactId)
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("[pipeline] updateContactStage error:", error.message);
    return false;
  }
  return true;
}

