import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/features/workspace/services/active-workspace";
import {
  updateContactStage,
  stageExistsInWorkspace,
} from "@/features/pipeline/services/pipeline";

export const dynamic = "force-dynamic";

// PATCH /api/pipeline/stage  { contactId, stage, pipelineId? }
export async function PATCH(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const membership = await getActiveWorkspace(supabase, user.id);
  if (!membership) {
    return NextResponse.json({ error: "no active workspace" }, { status: 400 });
  }

  let body: { contactId?: unknown; stage?: unknown; pipelineId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const contactId = typeof body.contactId === "string" ? body.contactId : "";
  const stage = typeof body.stage === "string" ? body.stage : "";
  const pipelineId =
    typeof body.pipelineId === "string" ? body.pipelineId : null;

  if (!contactId || !stage) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const valid = await stageExistsInWorkspace(membership.workspace_id, stage);
  if (!valid) {
    return NextResponse.json({ error: "unknown stage" }, { status: 400 });
  }

  const ok = await updateContactStage(
    membership.workspace_id,
    contactId,
    stage,
    pipelineId,
  );
  if (!ok) {
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
