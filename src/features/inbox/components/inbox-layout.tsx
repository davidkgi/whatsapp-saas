"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { ConversationList } from "./conversation-list";
import { useRealtimeConversations } from "@/features/inbox/hooks/use-realtime-conversations";

import type {
  ConversationWithContact,
  ConversationState,
} from "@/features/inbox/types";

type FilterTab = "all" | "ai_active" | "human_active" | "handoff_pending";

interface InboxLayoutProps {
  conversations: ConversationWithContact[];
  workspaceId: string | null;
  children: React.ReactNode;
}

export function InboxLayout({
  conversations,
  workspaceId,
  children,
}: InboxLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  // Mantiene la lista actualizada en tiempo real cuando cambian
  // conversaciones, mensajes, estados o handoffs.
  useRealtimeConversations(workspaceId);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return conversations.filter((conversation) => {
      const matchesSearch =
        query === "" ||
        (conversation.contact.name ?? "").toLowerCase().includes(query) ||
        conversation.contact.phone.toLowerCase().includes(query);

      const matchesTab =
        activeTab === "all" ||
        (conversation.state as ConversationState) ===
          (activeTab as ConversationState);

      return matchesSearch && matchesTab;
    });
  }, [conversations, search, activeTab]);

  const selectedConversationId = useMemo(() => {
    const match = pathname.match(/\/inbox\/([^/]+)/);

    return match?.[1];
  }, [pathname]);

  const handleSelectConversation = (
    conversation: ConversationWithContact,
  ) => {
    router.push(`/inbox/${conversation.id}`);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0 overflow-hidden bg-background">
      {/* Panel izquierdo */}
      <ConversationList
        conversations={filtered}
        selectedConversationId={selectedConversationId}
        search={search}
        activeTab={activeTab}
        onSearchChange={setSearch}
        onTabChange={setActiveTab}
        onSelectConversation={handleSelectConversation}
      />

      {/* Panel central / detalle */}
      <main className="min-w-0 flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}