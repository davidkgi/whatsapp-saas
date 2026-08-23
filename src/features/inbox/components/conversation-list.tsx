"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { ConversationWithContact } from "../types";
import { ConversationItem } from "./conversation-item";

type InboxTab =
  | "all"
  | "ai_active"
  | "human_active"
  | "handoff_pending";

interface ConversationListProps {
  conversations: ConversationWithContact[];
  selectedConversationId?: string;
  search: string;
  activeTab: InboxTab;
  onSearchChange: (value: string) => void;
  onTabChange: (tab: InboxTab) => void;
  onSelectConversation: (
    conversation: ConversationWithContact,
  ) => void;
}

export function ConversationList({
  conversations,
  selectedConversationId,
  search,
  activeTab,
  onSearchChange,
  onTabChange,
  onSelectConversation,
}: ConversationListProps) {
  const counts = {
    all: conversations.length,

    ai_active: conversations.filter(
      (conversation) =>
        conversation.state === "ai_active",
    ).length,

    human_active: conversations.filter(
      (conversation) =>
        conversation.state === "human_active",
    ).length,

    handoff_pending: conversations.filter(
      (conversation) =>
        conversation.state === "handoff_pending",
    ).length,
  };

  const tabs: Array<{
    key: InboxTab;
    label: string;
  }> = [
    {
      key: "all",
      label: "Todos",
    },
    {
      key: "ai_active",
      label: "IA",
    },
    {
      key: "human_active",
      label: "Humano",
    },
    {
      key: "handoff_pending",
      label: "Atención",
    },
  ];

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r bg-background md:w-[320px] xl:w-[340px]">
      {/* Header */}
      <div className="border-b px-4 pb-4 pt-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">
              Conversaciones
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Gestiona tus chats de WhatsApp
            </p>
          </div>

          <div className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">
            {counts.all}
          </div>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={(event) =>
              onSearchChange(event.target.value)
            }
            placeholder="Buscar nombre o teléfono..."
            className="h-10 rounded-xl bg-background pl-9"
          />
        </div>

        {/* Filtros */}
        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive =
              activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() =>
                  onTabChange(tab.key)
                }
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                <span>
                  {tab.label}
                </span>

                <span
                  className={cn(
                    "flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px]",
                    isActive
                      ? "bg-primary-foreground/15 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {counts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de conversaciones */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {conversations.length === 0 ? (
          <div className="flex h-full min-h-[220px] items-center justify-center px-6 text-center">
            <div>
              <p className="text-sm font-medium">
                No encontramos conversaciones
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Prueba cambiando la búsqueda o los filtros.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map(
              (conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={
                    conversation
                  }
                  isActive={
                    selectedConversationId ===
                    conversation.id
                  }
                  onClick={() =>
                    onSelectConversation(
                      conversation,
                    )
                  }
                />
              ),
            )}
          </div>
        )}
      </div>
    </aside>
  );
}