import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/features/workspace/services/active-workspace";
import {
  getPipelines,
  getPipelineStages,
  getPipelineCards,
} from "@/features/pipeline/services/pipeline";
import { PipelineBoard } from "@/features/pipeline/components/pipeline-board";

export const dynamic = "force-dynamic";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ pipeline?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const membership = await getActiveWorkspace(supabase, user.id);

  if (!membership) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground text-sm">
          No tienes un workspace activo.
        </p>
      </div>
    );
  }

  const { pipeline: pipelineParam } = await searchParams;

  const pipelines = await getPipelines(membership.workspace_id);

  if (pipelines.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground text-sm">
          Este workspace no tiene pipelines configurados.
        </p>
      </div>
    );
  }

  // Resolve the active pipeline: from the URL, else the default, else the first.
  const active =
    pipelines.find((p) => p.id === pipelineParam) ??
    pipelines.find((p) => p.isDefault) ??
    pipelines[0];

  const stages = await getPipelineStages(membership.workspace_id, active.id);

  // Agents see only their own leads; admin/manager see the whole pipeline.
  const ownerId = membership.role === "agent" ? user.id : null;

  const cards = await getPipelineCards(membership.workspace_id, active.id, {
    ownerId,
    includeNull: active.isDefault, // brand-new (unassigned-pipeline) leads land here
  });

  return (
    <PipelineBoard
      stages={stages}
      pipelines={pipelines}
      activePipelineId={active.id}
      initialCards={cards}
    />
  );
}
