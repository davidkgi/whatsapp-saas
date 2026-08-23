"use client";

import { useState } from "react";
import {
  Bot,
  Building2,
  Cable,
  FileText,
  Library,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";

import { BusinessInfoForm } from "./business-info-form";
import { ToolsCatalog } from "./tools-catalog";
import { IntegrationsTab } from "./integrations-tab";
import { TeamTab } from "./team-tab";
import { TemplatesTab } from "./templates-tab";
import { AutomationsTab } from "./automations-tab";
import { KbTab } from "./kb-tab";

import { AgentsTab } from "@/features/agents/components/agents-tab";
import type { AgentDto } from "@/features/agents/types";

import { cn } from "@/lib/utils";

interface ToolItem {
  id: string;
  key: string;
  name: string;
  description: string | null;
  sensitivity: string | null;
  enabled: boolean;
  config: Record<string, unknown> | null;
}

interface Props {
  workspaceId: string;
  role: string;
  initialBusinessInfo: Record<string, unknown> | null;
  initialTools: ToolItem[];
  initialIntegrations: unknown[];
  initialTemplates?: unknown[];
  initialAgents?: AgentDto[];
}

type SettingsSection =
  | "agentes"
  | "integraciones"
  | "negocio"
  | "tools"
  | "templates"
  | "knowledge-base"
  | "equipo"
  | "automatizaciones";

const SETTINGS_NAV: Array<{
  id: SettingsSection;
  label: string;
  description: string;
  icon: typeof Bot;
}> = [
  {
    id: "agentes",
    label: "Agentes",
    description: "Configura tus agentes de IA",
    icon: Bot,
  },
  {
    id: "integraciones",
    label: "Integraciones",
    description: "WhatsApp y servicios externos",
    icon: Cable,
  },
  {
    id: "negocio",
    label: "Negocio",
    description: "Información del workspace",
    icon: Building2,
  },
  {
    id: "tools",
    label: "Tools",
    description: "Herramientas disponibles para IA",
    icon: Settings2,
  },
  {
    id: "templates",
    label: "Templates",
    description: "Plantillas de mensajería",
    icon: FileText,
  },
  {
    id: "knowledge-base",
    label: "Knowledge Base",
    description: "Fuentes de conocimiento",
    icon: Library,
  },
  {
    id: "equipo",
    label: "Equipo",
    description: "Usuarios y permisos",
    icon: Users,
  },
  {
    id: "automatizaciones",
    label: "Automatizaciones",
    description: "Reglas y flujos automáticos",
    icon: Sparkles,
  },
];

export function SettingsShell({
  workspaceId,
  initialBusinessInfo,
  initialTools,
  initialIntegrations,
  initialTemplates = [],
  initialAgents = [],
}: Props) {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("agentes");

  const biForForm = initialBusinessInfo as {
    structured: Record<string, unknown>;
    free_text: string | null;
  } | null;

  const activeItem = SETTINGS_NAV.find(
    (item) => item.id === activeSection,
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f7f8fb]">
      {/* HEADER */}
      <header className="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Configuración
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Administra agentes, integraciones y preferencias del workspace.
          </p>
        </div>
      </header>

      {/* BODY */}
      <div className="flex min-h-0 flex-1">
        {/* SETTINGS NAV */}
        <aside className="hidden w-[250px] shrink-0 border-r border-slate-200 bg-white lg:block">
          <div className="p-3">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Workspace
            </p>

            <nav className="space-y-1">
              {SETTINGS_NAV.map((item) => {
                const Icon = item.icon;
                const isActive =
                  activeSection === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setActiveSection(item.id)
                    }
                    className={cn(
                      "group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
                      isActive
                        ? "bg-violet-50 text-violet-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                        isActive
                          ? "bg-violet-100 text-violet-700"
                          : "bg-slate-100 text-slate-400 group-hover:text-slate-600",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold">
                        {item.label}
                      </p>

                      <p
                        className={cn(
                          "mt-0.5 text-[10px] leading-relaxed",
                          isActive
                            ? "text-violet-500"
                            : "text-slate-400",
                        )}
                      >
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* MOBILE NAV */}
        <div className="border-b bg-white p-3 lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {SETTINGS_NAV.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeSection === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setActiveSection(item.id)
                  }
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors",
                    isActive
                      ? "border-violet-200 bg-violet-50 text-violet-700"
                      : "border-slate-200 bg-white text-slate-500",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* CONTENT */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-5 py-5 sm:px-6">
            {/* SECTION HEADER */}
            <div className="mb-5">
              <h2 className="text-base font-semibold text-slate-900">
                {activeItem?.label}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {activeItem?.description}
              </p>
            </div>

            {/* SECTION CONTENT */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="p-5 sm:p-6">
                {activeSection === "agentes" && (
                  <AgentsTab
                    workspaceId={workspaceId}
                    initialAgents={initialAgents}
                  />
                )}

                {activeSection ===
                  "integraciones" && (
                  <IntegrationsTab
                    workspaceId={workspaceId}
                    initialIntegrations={
                      initialIntegrations
                    }
                  />
                )}

                {activeSection === "negocio" && (
                  <BusinessInfoForm
                    workspaceId={workspaceId}
                    initial={biForForm}
                  />
                )}

                {activeSection === "tools" && (
                  <ToolsCatalog
                    workspaceId={workspaceId}
                    initialTools={initialTools}
                  />
                )}

                {activeSection ===
                  "templates" && (
                  <TemplatesTab
                    workspaceId={workspaceId}
                    initialTemplates={
                      initialTemplates
                    }
                  />
                )}

                {activeSection ===
                  "knowledge-base" && (
                  <KbTab
                    workspaceId={workspaceId}
                  />
                )}

                {activeSection === "equipo" && (
                  <TeamTab
                    workspaceId={workspaceId}
                  />
                )}

                {activeSection ===
                  "automatizaciones" && (
                  <AutomationsTab
                    workspaceId={workspaceId}
                  />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}