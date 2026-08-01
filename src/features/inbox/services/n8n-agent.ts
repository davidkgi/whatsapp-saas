// ──────────────────────────────────────────────────────────────────────────────
// n8n-agent.ts — routes the agent "brain" to an external n8n workflow.
//
// When a workspace has an ENABLED `n8n` integration, processNextBatch() calls
// callN8nAgent() instead of the internal LLM stack (prompt-builder + KB +
// generateWithTools). The app still owns everything around it: buffering,
// decide() gating (handoff / ai_enabled / rate limits), the 24h-window and
// opt-out guards, message persistence and the inbox — because we keep sending
// the reply through dispatchText() back in the buffer.
//
// Media (voice notes / images) is NOT understood here: the app only downloads &
// stores it (media-handler). We hand n8n short-lived SIGNED URLs so the workflow
// fetches the file and does transcription (Whisper) / vision on its side.
// ──────────────────────────────────────────────────────────────────────────────

import { createClient as createSbClient } from "@supabase/supabase-js";
import {
  getConversationHistory,
  type ConversationTurn,
} from "./conversation-history";

const MEDIA_BUCKET = "whatsapp-media";
const SIGNED_URL_TTL_SECONDS = 600; // 10 min — plenty for n8n to fetch
const HISTORY_WINDOW = 10;
const N8N_TIMEOUT_MS = 60_000;

function svc() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export interface N8nIntegration {
  webhookUrl: string;
  secret: string;
}

export interface N8nAgentAction {
  type: "handoff" | "add_tag" | "send_template" | "set_stage";
  [key: string]: unknown;
}

export interface N8nAgentReply {
  text: string;
  actions: N8nAgentAction[];
}

interface MediaRef {
  type: string;
  mime: string | null;
  caption: string | null;
  signed_url: string | null;
}

// ──────────────────────────────────────────────────────────────────────────────
// getN8nIntegration
// Returns the enabled `n8n` integration for a workspace, or null when the
// workspace should keep using the internal engine.
//   config.webhook_url  → the n8n Webhook node URL
//   credentials.secret  → shared secret echoed back as X-Agent-Secret
// ──────────────────────────────────────────────────────────────────────────────
export async function getN8nIntegration(
  workspaceId: string,
): Promise<N8nIntegration | null> {
  const supabase = svc();

  const { data } = await supabase
    .from("integrations")
    .select("credentials, config")
    .eq("workspace_id", workspaceId)
    .eq("provider", "n8n")
    .eq("enabled", true)
    .maybeSingle();

  if (!data) return null;

  const config = (data.config ?? {}) as Record<string, unknown>;
  const credentials = (data.credentials ?? {}) as Record<string, unknown>;

  const webhookUrl =
    typeof config.webhook_url === "string" ? config.webhook_url.trim() : "";
  const secret =
    typeof credentials.secret === "string" ? credentials.secret : "";

  if (!webhookUrl) return null;

  return { webhookUrl, secret };
}

// ──────────────────────────────────────────────────────────────────────────────
// buildMediaRefs (private)
// For every inbound media message in the current batch, mint a short-lived
// signed URL from its Supabase Storage path so n8n can fetch it.
// ──────────────────────────────────────────────────────────────────────────────
async function buildMediaRefs(
  batchId: string,
  supabase: ReturnType<typeof svc>,
): Promise<MediaRef[]> {
  const { data: msgs } = await supabase
    .from("messages")
    .select("type, meta")
    .eq("batch_id", batchId)
    .eq("direction", "in");

  if (!msgs) return [];

  const refs: MediaRef[] = [];

  for (const m of msgs as Array<{
    type: string;
    meta: Record<string, unknown> | null;
  }>) {
    const meta = m.meta ?? {};
    const storagePath =
      typeof meta.storage_path === "string" ? meta.storage_path : null;
    if (!storagePath) continue; // text-only message → no media ref

    const { data: signed } = await supabase.storage
      .from(MEDIA_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    refs.push({
      type: m.type,
      mime: typeof meta.mime_type === "string" ? meta.mime_type : null,
      caption: typeof meta.caption === "string" ? meta.caption : null,
      signed_url: signed?.signedUrl ?? null,
    });
  }

  return refs;
}

export interface CallN8nParams {
  integration: N8nIntegration;
  workspaceId: string;
  conversationId: string;
  contactId: string;
  batchId: string;
  mergedText: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// callN8nAgent
// POSTs the consolidated context to the n8n webhook and expects back a JSON
// body: { text: string, actions?: N8nAgentAction[] }. Throws on any failure so
// the buffer's retry/dead-letter path handles it (no silent drops).
// ──────────────────────────────────────────────────────────────────────────────
export async function callN8nAgent(p: CallN8nParams): Promise<N8nAgentReply> {
  const supabase = svc();

  const [history, media]: [ConversationTurn[], MediaRef[]] = await Promise.all([
    getConversationHistory(p.conversationId, {
      limit: HISTORY_WINDOW,
      excludeBatchId: p.batchId,
    }),
    buildMediaRefs(p.batchId, supabase),
  ]);

  const payload = {
    workspaceId: p.workspaceId,
    conversationId: p.conversationId,
    contactId: p.contactId,
    mergedText: p.mergedText,
    history: history.map((t) => ({ role: t.role, content: t.content })),
    media,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(p.integration.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agent-Secret": p.integration.secret,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`[n8n-agent] webhook request failed: ${msg}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`[n8n-agent] webhook responded ${res.status}`);
  }

  const data = (await res.json()) as { text?: unknown; actions?: unknown };

  const text = typeof data.text === "string" ? data.text.trim() : "";
  if (!text) {
    throw new Error("[n8n-agent] webhook returned no `text`");
  }

  const actions = Array.isArray(data.actions)
    ? (data.actions as N8nAgentAction[])
    : [];

  return { text, actions };
}
