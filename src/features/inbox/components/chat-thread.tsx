"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart2,
  Bot,
  ChevronDown,
  MessageSquareText,
  MoreHorizontal,
  PanelRight,
  Send,
  StickyNote,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { useRealtimeMessages } from "@/features/inbox/hooks/use-realtime-messages";
import type { WorkspaceRole } from "@/features/inbox/hooks/use-role";
import {
  canHandoff,
  canSendMessages,
  canTakeConversation,
  canViewObservability,
} from "@/features/inbox/hooks/use-role";

import { AiToggleButton } from "./ai-toggle-button";
import { ChatMessage } from "./chat-message";
import { WindowBanner } from "./window-banner";
import { TemplatePicker } from "./template-picker";
import { CrmPanel } from "./crm-panel";
import { ObservabilityPanel } from "./observability-panel";
import { RoleGate } from "./role-gate";

import type {
  ConversationWithContact,
  MessageRow,
} from "@/features/inbox/types";

interface ChatThreadProps {
  conversation: ConversationWithContact;
  initialMessages: MessageRow[];
  currentUserId: string;
  role?: WorkspaceRole;
}

function getInitials(
  name: string | null,
  phone: string,
) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return name.slice(0, 2).toUpperCase();
  }

  return phone.slice(-2);
}

export function ChatThread({
  conversation,
  initialMessages,
  currentUserId: _currentUserId,
  role = "agent",
}: ChatThreadProps) {
  const router = useRouter();

  const messages = useRealtimeMessages(
    conversation.id,
    initialMessages,
  );

  const bottomRef = useRef<HTMLDivElement>(null);

  const [showCrm, setShowCrm] = useState(true);

  const [
    showObservability,
    setShowObservability,
  ] = useState(false);

  const [
    handoffLoading,
    setHandoffLoading,
  ] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [noteMode, setNoteMode] = useState(false);
  const [note, setNote] = useState("");

  const [
    savingNote,
    setSavingNote,
  ] = useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isWindowExpired =
    mounted &&
    conversation.window_expires_at != null &&
    new Date(
      conversation.window_expires_at,
    ).getTime() < Date.now();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const contactName =
    conversation.contact.name ??
    conversation.contact.phone;

  const initials = getInitials(
    conversation.contact.name,
    conversation.contact.phone,
  );

  const stage =
    conversation.contact.stage ?? "Sin etapa";

  const handleSend = async () => {
    const trimmed = draft.trim();

    if (!trimmed || sending) {
      return;
    }

    setSending(true);

    try {
      const res = await fetch(
        `/api/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            body: trimmed,
          }),
        },
      );

      if (!res.ok) {
        const data = await res
          .json()
          .catch(() => ({}));

        toast.error(
          (
            data as {
              error?: string;
            }
          ).error ?? "Error al enviar",
        );

        return;
      }

      setDraft("");
    } catch {
      toast.error("Error al enviar");
    } finally {
      setSending(false);
    }
  };

  const handleHandoffRequest = async () => {
    setHandoffLoading(true);

    try {
      const res = await fetch(
        `/api/conversations/${conversation.id}/handoff`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "request",
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json();

        toast.error(
          data.error ??
            "Error al solicitar handoff",
        );

        return;
      }

      toast.success(
        "Conversación enviada a atención humana",
      );

      router.refresh();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setHandoffLoading(false);
    }
  };

  const handleReturnToAi = async () => {
    setHandoffLoading(true);

    try {
      const res = await fetch(
        `/api/conversations/${conversation.id}/handoff`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "cancel",
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json();

        toast.error(
          data.error ??
            "Error al devolver a IA",
        );

        return;
      }

      toast.success(
        "Conversación devuelta a la IA",
      );

      router.refresh();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setHandoffLoading(false);
    }
  };

  const handleSaveNote = async () => {
    const trimmed = note.trim();

    if (!trimmed || savingNote) {
      return;
    }

    setSavingNote(true);

    try {
      const res = await fetch(
        `/api/conversations/${conversation.id}/notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: trimmed,
          }),
        },
      );

      if (!res.ok) {
        const data = await res
          .json()
          .catch(() => ({}));

        toast.error(
          (
            data as {
              error?: string;
            }
          ).error ??
            "Error al guardar nota",
        );

        return;
      }

      setNote("");
      setNoteMode(false);

      toast.success("Nota guardada");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingNote(false);
    }
  };

  const handleTakeConversation = async () => {
    setHandoffLoading(true);

    try {
      const res = await fetch(
        `/api/conversations/${conversation.id}/take`,
        {
          method: "POST",
        },
      );

      if (!res.ok) {
        const data = await res.json();

        toast.error(
          data.error ??
            "Error al tomar la conversación",
        );

        return;
      }

      toast.success("Conversación tomada");

      router.refresh();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setHandoffLoading(false);
    }
  };

  return (
    <div className="flex h-full min-w-0 overflow-hidden bg-[#f8fafc]">
      <section className="flex min-w-0 flex-1 flex-col">
        {/* HEADER */}
        <header className="shrink-0 border-b bg-white px-4 py-2.5">
          <div className="flex items-center justify-between gap-4">
            {/* Contacto */}
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-semibold text-violet-700">
                {initials}
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-slate-900">
                  {contactName}
                </h2>

                <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] text-slate-500">
                  <span className="truncate">
                    {conversation.contact.phone}
                  </span>

                  <span className="text-slate-300">
                    •
                  </span>

                  <span className="truncate">
                    {stage}
                  </span>

                  {conversation.state ===
                    "handoff_pending" && (
                    <>
                      <span className="text-slate-300">
                        •
                      </span>

                      <span className="font-medium text-amber-600">
                        requiere atención
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex shrink-0 items-center gap-1.5">
              {/* IA */}
              <div className="hidden rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-0.5 lg:block">
                <AiToggleButton
                  conversationId={
                    conversation.id
                  }
                  initialEnabled={
                    conversation.ai_enabled
                  }
                />
              </div>

              {/* CRM */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() =>
                  setShowCrm(
                    (value) => !value,
                  )
                }
                aria-label="Ver detalles del contacto"
                aria-pressed={showCrm}
                className={cn(
                  "h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700",
                  showCrm &&
                    "bg-violet-50 text-violet-700",
                )}
              >
                <PanelRight className="h-4 w-4" />
              </Button>

              {/* Observabilidad */}
              <RoleGate
                role={role}
                check={
                  canViewObservability
                }
              >
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    setShowObservability(
                      (value) => !value,
                    )
                  }
                  aria-label="Ver observabilidad"
                  aria-pressed={
                    showObservability
                  }
                  className={cn(
                    "hidden h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 xl:inline-flex",
                    showObservability &&
                      "bg-violet-50 text-violet-700",
                  )}
                >
                  <BarChart2 className="h-4 w-4" />
                </Button>
              </RoleGate>

              {/* Menú de acciones */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Más acciones"
                    className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-52"
                >
                  {conversation.state ===
                    "ai_active" &&
                    canHandoff(role) && (
                      <DropdownMenuItem
                        disabled={handoffLoading}
                        onSelect={() => {
                          void handleHandoffRequest();
                        }}
                        className="cursor-pointer"
                      >
                        <UserCheck className="mr-2 h-4 w-4 text-amber-600" />

                        <span>
                          Pasar a humano
                        </span>
                      </DropdownMenuItem>
                    )}

                  {conversation.state ===
                    "handoff_pending" &&
                    canTakeConversation(
                      role,
                    ) && (
                      <DropdownMenuItem
                        disabled={handoffLoading}
                        onSelect={() => {
                          void handleTakeConversation();
                        }}
                        className="cursor-pointer"
                      >
                        <UserCheck className="mr-2 h-4 w-4 text-violet-600" />

                        <span>
                          Tomar conversación
                        </span>
                      </DropdownMenuItem>
                    )}

                  {conversation.state ===
                    "human_active" &&
                    canTakeConversation(
                      role,
                    ) && (
                      <DropdownMenuItem
                        disabled={handoffLoading}
                        onSelect={() => {
                          void handleReturnToAi();
                        }}
                        className="cursor-pointer"
                      >
                        <Bot className="mr-2 h-4 w-4 text-emerald-600" />

                        <span>
                          Devolver a IA
                        </span>
                      </DropdownMenuItem>
                    )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    disabled
                    className="text-xs text-muted-foreground"
                  >
                    Más acciones próximamente
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* BANNER */}
        <WindowBanner
          windowExpiresAt={
            conversation.window_expires_at ??
            null
          }
        />

        {/* MENSAJES */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-6 py-6">
            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <MessageSquareText className="h-5 w-5 text-muted-foreground" />
                </div>

                <p className="text-sm font-medium text-foreground">
                  No hay mensajes aún
                </p>

                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Los mensajes entrantes aparecerán aquí en tiempo real.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                  />
                ))}
              </div>
            )}

            <div
              ref={bottomRef}
              aria-hidden="true"
            />
          </div>
        </ScrollArea>

        {/* COMPOSER */}
        <footer
          className={cn(
            "shrink-0 border-t bg-background px-4 py-3",
            noteMode &&
              "border-amber-200 bg-amber-50/40",
          )}
        >
          <div className="mx-auto w-full max-w-6xl">
            {isWindowExpired ? (
              <div>
                <TemplatePicker
                  conversationId={
                    conversation.id
                  }
                  workspaceId={
                    conversation.workspace_id
                  }
                />
              </div>
            ) : !canSendMessages(role) ? (
              <div className="rounded-xl border border-dashed py-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Solo lectura — no tienes permisos para enviar mensajes.
                </p>
              </div>
            ) : noteMode ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-700">
                    <StickyNote className="h-4 w-4" />

                    <span className="text-xs font-medium">
                      Nota interna
                    </span>

                    <span className="text-[10px] text-amber-600/70">
                      No visible para el contacto
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNoteMode(false);
                      setNote("");
                    }}
                    className="h-7 text-xs text-muted-foreground"
                  >
                    Cancelar
                  </Button>
                </div>

                <div className="flex items-end gap-2">
                  <Textarea
                    value={note}
                    onChange={(event) =>
                      setNote(
                        event.target.value,
                      )
                    }
                    placeholder="Escribe una nota interna..."
                    className="min-h-[44px] max-h-32 flex-1 resize-none rounded-xl border-amber-200 bg-background text-sm focus-visible:ring-amber-300"
                    rows={2}
                    disabled={savingNote}
                    onKeyDown={(event) => {
                      if (
                        event.key ===
                          "Enter" &&
                        !event.shiftKey
                      ) {
                        event.preventDefault();

                        void handleSaveNote();
                      }
                    }}
                  />

                  <Button
                    type="button"
                    onClick={() =>
                      void handleSaveNote()
                    }
                    disabled={
                      savingNote ||
                      note.trim().length === 0
                    }
                    className="h-11 rounded-xl px-4"
                  >
                    {savingNote
                      ? "Guardando..."
                      : "Guardar"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    setNoteMode(true)
                  }
                  aria-label="Agregar nota interna"
                  className="h-11 w-11 shrink-0 rounded-xl border text-muted-foreground hover:bg-amber-50 hover:text-amber-700"
                >
                  <StickyNote className="h-4 w-4" />
                </Button>

                <div className="relative min-w-0 flex-1">
                  <Textarea
                    value={draft}
                    onChange={(event) =>
                      setDraft(
                        event.target.value,
                      )
                    }
                    placeholder="Escribe un mensaje..."
                    className="min-h-[46px] max-h-32 resize-none rounded-2xl border bg-muted/20 px-4 py-3 pr-12 text-sm shadow-none focus-visible:ring-1"
                    rows={1}
                    disabled={sending}
                    onKeyDown={(event) => {
                      if (
                        event.key ===
                          "Enter" &&
                        !event.shiftKey
                      ) {
                        event.preventDefault();

                        void handleSend();
                      }
                    }}
                  />

                  <button
                    type="button"
                    className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-[10px] text-muted-foreground"
                    tabIndex={-1}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>

                <Button
                  type="button"
                  size="icon"
                  onClick={() =>
                    void handleSend()
                  }
                  disabled={
                    sending ||
                    draft.trim().length === 0
                  }
                  aria-label="Enviar mensaje"
                  className="h-11 w-11 shrink-0 rounded-xl"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </footer>
      </section>

      {/* CRM */}
      {showCrm && (
        <aside className="hidden w-[300px] shrink-0 border-l bg-background xl:block">
          <CrmPanel
            contact={conversation.contact}
            conversationId={conversation.id}
          />
        </aside>
      )}

      {/* OBSERVABILIDAD */}
      {showObservability && (
        <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l bg-background p-4 xl:block">
          <ObservabilityPanel
            conversationId={conversation.id}
          />
        </aside>
      )}
    </div>
  );
}