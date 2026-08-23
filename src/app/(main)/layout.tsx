import { redirect } from "next/navigation";
import Link from "next/link";

import {
  Building2,
  Columns3,
  LogOut,
  MessageCircle,
  Settings,
  Sparkles,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { logout } from "@/features/auth/services/actions";

import {
  getActiveWorkspace,
  listMemberships,
} from "@/features/workspace/services/active-workspace";

import { WorkspaceSwitcher } from "@/features/workspace/components/workspace-switcher";
import { Button } from "@/components/ui/button";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: userRow }, active, memberships] =
    await Promise.all([
      supabase
        .from("users")
        .select("is_super_admin")
        .eq("id", user.id)
        .maybeSingle(),

      getActiveWorkspace(
        supabase,
        user.id,
      ),

      listMemberships(
        supabase,
        user.id,
      ),
    ]);

  const isSuperAdmin =
    userRow?.is_super_admin ?? false;

  const activeId =
    active?.workspace_id ?? null;

  const workspaceName =
    memberships.find(
      (membership) =>
        membership.workspace_id ===
        activeId,
    )?.name ?? null;

  const userEmail =
    user.email ?? "Usuario";

  return (
    <div className="flex min-h-screen bg-[#f7f8fb]">
      {/* ========================================= */}
      {/* SIDEBAR DESKTOP */}
      {/* ========================================= */}

      <aside className="hidden min-h-screen w-[230px] shrink-0 flex-col bg-[#071b3b] text-white md:flex">
        {/* Brand */}
        <div className="flex h-[72px] shrink-0 items-center border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-950/20">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>

            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight">
                Immer
                <span className="font-normal text-white/75">
                  Connect
                </span>
              </div>

              <div className="mt-0.5 text-[10px] text-white/45">
                WhatsApp CRM
              </div>
            </div>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-5">
          <div className="space-y-1">
            <Link
              href="/inbox"
              className="group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-white/75 transition-all hover:bg-white/10 hover:text-white"
            >
              <MessageCircle className="h-[18px] w-[18px]" />

              <span>
                Chats
              </span>
            </Link>

            <Link
              href="/pipeline"
              className="group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-white/75 transition-all hover:bg-white/10 hover:text-white"
            >
              <Columns3 className="h-[18px] w-[18px]" />

              <span>
                Pipeline
              </span>
            </Link>

            <Link
              href="/settings"
              className="group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-white/75 transition-all hover:bg-white/10 hover:text-white"
            >
              <Settings className="h-[18px] w-[18px]" />

              <span>
                Configuración
              </span>
            </Link>

            {isSuperAdmin && (
              <Link
                href="/workspaces"
                className="group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-white/75 transition-all hover:bg-white/10 hover:text-white"
              >
                <Building2 className="h-[18px] w-[18px]" />

                <span>
                  Agency
                </span>
              </Link>
            )}
          </div>

          {/* Separador */}
          <div className="my-6 border-t border-white/10" />

          {/* Próximamente */}
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-white/70">
              <Sparkles className="h-4 w-4 text-violet-300" />

              Próximamente
            </div>

            <p className="mt-2 text-[11px] leading-relaxed text-white/40">
              Contactos, plantillas y plan de trabajo.
            </p>
          </div>
        </nav>

        {/* Usuario + workspace */}
        <div className="shrink-0 border-t border-white/10 p-3">
          {workspaceName && (
            <div className="mb-3 rounded-xl bg-white/[0.05] p-3">
              <div className="text-[10px] uppercase tracking-wider text-white/35">
                Workspace
              </div>

              {memberships.length > 1 &&
              activeId ? (
                <div className="mt-1.5 text-white">
                  <WorkspaceSwitcher
                    workspaces={memberships.map(
                      (membership) => ({
                        workspace_id:
                          membership.workspace_id,
                        name:
                          membership.name,
                      }),
                    )}
                    activeId={activeId}
                  />
                </div>
              ) : (
                <p
                  className="mt-1 truncate text-xs font-medium text-white/75"
                  title={
                    workspaceName
                  }
                >
                  {workspaceName}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 px-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[11px] font-semibold text-violet-200">
              {userEmail
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white/75">
                {userEmail}
              </p>

              <p className="text-[10px] text-white/35">
                {isSuperAdmin
                  ? "Super admin"
                  : "Usuario"}
              </p>
            </div>

            <form action={logout}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/45 hover:bg-white/10 hover:text-white"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* ========================================= */}
      {/* CONTENIDO */}
      {/* ========================================= */}

      <main className="min-w-0 flex-1">
        {children}
      </main>

      {/* ========================================= */}
      {/* NAVEGACIÓN MOBILE */}
      {/* ========================================= */}

      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t bg-white px-4 shadow-sm md:hidden">
        <Link
          href="/inbox"
          className="flex flex-col items-center gap-1 text-[11px] text-slate-600"
        >
          <MessageCircle className="h-5 w-5" />
          <span>Chats</span>
        </Link>

        <Link
          href="/pipeline"
          className="flex flex-col items-center gap-1 text-[11px] text-slate-600"
        >
          <Columns3 className="h-5 w-5" />
          <span>Pipeline</span>
        </Link>

        <Link
          href="/settings"
          className="flex flex-col items-center gap-1 text-[11px] text-slate-600"
        >
          <Settings className="h-5 w-5" />
          <span>Config.</span>
        </Link>

        {isSuperAdmin && (
          <Link
            href="/workspaces"
            className="flex flex-col items-center gap-1 text-[11px] text-slate-600"
          >
            <Building2 className="h-5 w-5" />
            <span>Agency</span>
          </Link>
        )}
      </nav>
    </div>
  );
}