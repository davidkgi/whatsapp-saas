"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Bot, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

import type {
  ConversationWithContact,
  ConversationState,
} from "@/features/inbox/types";

interface ConversationItemProps {
  conversation: ConversationWithContact;
  isActive: boolean;
  onClick: () => void;
}

const STATE_META: Partial<
  Record<
    ConversationState,
    {
      label: string;
      icon: typeof Bot;
      className: string;
    }
  >
> = {
  ai_active: {
    label: "IA activa",
    icon: Bot,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  },

  human_active: {
    label: "Humano",
    icon: UserRound,
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  },

  handoff_pending: {
    label: "Requiere atención",
    icon: AlertCircle,
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  },
};

function getInitials(
  name: string | null,
  phone: string,
): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/);

    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }

    return name.trim().slice(0, 2).toUpperCase();
  }

  return phone.slice(-4);
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";

  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diff = Date.now() - date.getTime();
  const minutes = Math.max(
    0,
    Math.floor(diff / 60_000),
  );

  if (minutes < 1) {
    return "ahora";
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d`;
  }

  return date.toLocaleDateString("es", {
    day: "numeric",
    month: "short",
  });
}

function truncate(
  text: string | null,
  max: number,
): string {
  if (!text) {
    return "Sin mensajes todavía";
  }

  return text.length > max
    ? `${text.slice(0, max)}…`
    : text;
}

export function ConversationItem({
  conversation,
  isActive,
  onClick,
}: ConversationItemProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    contact,
    last_message,
    unread_count,
    last_message_at,
  } = conversation;

  const displayName =
    contact.name ?? contact.phone;

  const initials = getInitials(
    contact.name,
    contact.phone,
  );

  const preview = truncate(
    last_message?.body ?? null,
    72,
  );

  /**
   * Evitamos calcular Date.now() durante SSR.
   * La hora relativa aparece solo después
   * de que React haya hidratado el componente.
   */
  const time = mounted
    ? timeAgo(last_message_at)
    : "";

  const stateMeta =
    STATE_META[
      conversation.state as ConversationState
    ];

  const StateIcon = stateMeta?.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={
        isActive ? "page" : undefined
      }
      className={cn(
        "group w-full rounded-xl border px-3 py-3 text-left transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",

        isActive
          ? "border-primary/20 bg-primary/[0.06] shadow-sm"
          : "border-transparent bg-transparent hover:border-border hover:bg-muted/45",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full",
              "select-none bg-primary/10 text-xs font-semibold text-primary",
            )}
            aria-hidden="true"
          >
            {initials}
          </div>

          {unread_count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground ring-2 ring-background">
              {unread_count > 99
                ? "99+"
                : unread_count}
            </span>
          )}
        </div>

        {/* Contenido */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {/* Nombre */}
              <p className="truncate text-sm font-semibold text-foreground">
                {displayName}
              </p>

              {/* Preview */}
              <p
                className="mt-0.5 truncate text-xs text-muted-foreground"
                suppressHydrationWarning
              >
                {mounted ? (
                  <>
                    {last_message?.direction ===
                    "out"
                      ? "Tú: "
                      : ""}

                    {preview}
                  </>
                ) : (
                  <span className="opacity-0">
                    Cargando conversación
                  </span>
                )}
              </p>
            </div>

            {/* Hora */}
            <span
              className={cn(
                "shrink-0 pt-0.5 text-[11px]",
                unread_count > 0
                  ? "font-medium text-primary"
                  : "text-muted-foreground",
              )}
              suppressHydrationWarning
            >
              {time}
            </span>
          </div>

          {/* Metadata */}
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              {/* Estado IA / humano */}
              {stateMeta &&
                StateIcon && (
                  <span
                    className={cn(
                      "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      stateMeta.className,
                    )}
                  >
                    <StateIcon
                      className="h-3 w-3 shrink-0"
                      aria-hidden="true"
                    />

                    <span className="truncate">
                      {stateMeta.label}
                    </span>
                  </span>
                )}

              {/* Etapa CRM */}
              {contact.stage && (
                <span className="truncate rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  {contact.stage}
                </span>
              )}
            </div>

            {/* Teléfono */}
            <span className="max-w-[110px] truncate text-[10px] text-muted-foreground/70">
              {contact.phone}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}