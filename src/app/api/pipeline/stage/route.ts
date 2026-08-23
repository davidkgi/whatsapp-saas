import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/features/workspace/services/active-workspace";
import { getDefaultPipelineStages } from "@/features/pipeline/services/pipeline";

export const dynamic = "force-dynamic";

// GET /api/pipeline/stages → stage defs of the workspace's default pipeline.
// Used by the inbox CRM panel to render the stage selector dynamically.
export async function GET() {
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

  const stages = await getDefaultPipelineStages(membership.workspace_id);
  return NextResponse.json({ stages });
}
