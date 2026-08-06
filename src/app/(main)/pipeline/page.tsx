import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/features/workspace/services/active-workspace";
import { getPipelineCards } from "@/features/pipeline/services/pipeline";
import { PipelineBoard } from "@/features/pipeline/components/pipeline-board";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
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

  // Agents see only their own leads; admin/manager see the whole pipeline.
  const ownerId = membership.role === "agent" ? user.id : null;
  const cards = await getPipelineCards(membership.workspace_id, { ownerId });

  return <PipelineBoard initialCards={cards} />;
}

