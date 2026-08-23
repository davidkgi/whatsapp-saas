import { Bot, PenLine } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MessageRow } from "@/features/inbox/types";

import { StatusIcon } from "./status-icon";
import { MessageAttachment } from "./message-attachment";

interface ChatMessageProps {
  message: MessageRow;
}

/**
 * Muestra quién envió un mensaje saliente:
 * - IA cuando no existe sender_user_id.
 * - Nombre del asesor cuando fue enviado manualmente.
 */
function OutboundAuthor({ message }: { message: MessageRow }) {
  if (!message.sender_user_id) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
        <Bot className="h-3 w-3" aria-hidden="true" />
        IA
      </span>
    );
  }

  const name = message.sender?.full_name ?? "Asesor";
  const initial = name.trim()[0]?.toUpperCase() ?? "A";

  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[8px] font-semibold text-foreground">
        {initial}
      </span>

      {name}
    </span>
  );
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function isInternalNote(message: MessageRow): boolean {
  return (
    message.type === "system" &&
    message.meta != null &&
    (message.meta as Record<string, unknown>).internal === true
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isOutbound = message.direction === "out";
  const time = formatTime(message.created_at);
  const internal = isInternalNote(message);

  /**
   * Nota interna
   */
  if (internal) {
    return (
      <div className="my-3 flex justify-center" role="note">
        <div className="max-w-[78%] rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
          <div className="mb-1.5 flex items-center gap-1.5 text-amber-700">
            <PenLine className="h-3.5 w-3.5" aria-hidden="true" />

            <span className="text-[10px] font-semibold uppercase tracking-wide">
              Nota interna
            </span>
          </div>

          {message.body && (
            <p className="whitespace-pre-wrap break-words text-sm italic leading-relaxed text-foreground/80">
              {message.body}
            </p>
          )}

          <div className="mt-1.5 flex justify-end">
            <span
              className="text-[10px] text-muted-foreground"
              suppressHydrationWarning
            >
              {time}
            </span>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Mensaje WhatsApp
   */
  return (
    <div
      className={cn(
        "flex w-full py-1",
        isOutbound ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "relative max-w-[78%] px-3.5 py-2.5 shadow-sm md:max-w-[68%]",
          isOutbound
            ? [
                "rounded-2xl rounded-br-md",
                "border border-emerald-200/70",
                "bg-emerald-50",
              ]
            : [
                "rounded-2xl rounded-bl-md",
                "border border-border/70",
                "bg-background",
              ],
        )}
      >
        {/* Contenido */}
        {message.type !== "text" && message.type !== "system" ? (
          <MessageAttachment media={message.meta} type={message.type} />
        ) : (
          message.body && (
            <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.45] text-foreground">
              {message.body}
            </p>
          )
        )}

        {/* Metadata */}
        <div
          className={cn(
            "mt-1.5 flex min-h-4 items-center gap-1.5",
            isOutbound ? "justify-end" : "justify-start",
          )}
        >
          {isOutbound && message.type !== "system" && (
            <OutboundAuthor message={message} />
          )}

          <span
            className="text-[10px] text-muted-foreground"
            suppressHydrationWarning
          >
            {time}
          </span>

          {isOutbound && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}