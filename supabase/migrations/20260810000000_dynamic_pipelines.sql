-- ============================================================================
-- BLOQUE A — Pipelines y etapas dinámicas por workspace (multi-pipeline).
--
-- Sustituye el enum fijo `contact_stage` por un modelo basado en datos:
--   pipelines        → cada workspace puede tener varios (como Kommo)
--   pipeline_stages  → las columnas del Kanban de cada pipeline
--   contacts.stage   → pasa de enum a TEXTO (guarda el `key` de la etapa)
--   contacts.pipeline_id → a qué pipeline pertenece el contacto
--
-- Cada workspace nuevo recibe automáticamente un pipeline por defecto genérico
-- (trigger). Los workspaces existentes se rellenan al final (backfill), sin
-- perder ningún dato de etapas actual.
-- Idempotente donde es posible. No usa ALTER TYPE ADD VALUE (convierte a texto),
-- así que puede correr en una sola transacción.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Tablas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pipelines_workspace ON pipelines(workspace_id);

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  key TEXT NOT NULL,              -- valor que usa el agente y se guarda en contacts.stage
  label TEXT NOT NULL,            -- lo que se ve en el Kanban
  color TEXT NOT NULL DEFAULT '#64748b',
  position INT NOT NULL DEFAULT 0,
  is_won BOOLEAN NOT NULL DEFAULT FALSE,
  is_lost BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pipeline_id, key)
);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline  ON pipeline_stages(pipeline_id, position);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_workspace ON pipeline_stages(workspace_id);

-- ---------------------------------------------------------------------------
-- 2) RLS (lectura: miembros del workspace; escritura: admin/manager)
-- ---------------------------------------------------------------------------
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ws members read pipelines" ON pipelines;
CREATE POLICY "ws members read pipelines"
  ON pipelines FOR SELECT
  USING (workspace_id IN (SELECT auth_workspace_ids()));

DROP POLICY IF EXISTS "ws managers write pipelines" ON pipelines;
CREATE POLICY "ws managers write pipelines"
  ON pipelines FOR ALL
  USING (auth_has_role(workspace_id, ARRAY['admin','manager']::workspace_role[]))
  WITH CHECK (auth_has_role(workspace_id, ARRAY['admin','manager']::workspace_role[]));

DROP POLICY IF EXISTS "ws members read pipeline_stages" ON pipeline_stages;
CREATE POLICY "ws members read pipeline_stages"
  ON pipeline_stages FOR SELECT
  USING (workspace_id IN (SELECT auth_workspace_ids()));

DROP POLICY IF EXISTS "ws managers write pipeline_stages" ON pipeline_stages;
CREATE POLICY "ws managers write pipeline_stages"
  ON pipeline_stages FOR ALL
  USING (auth_has_role(workspace_id, ARRAY['admin','manager']::workspace_role[]))
  WITH CHECK (auth_has_role(workspace_id, ARRAY['admin','manager']::workspace_role[]));

-- ---------------------------------------------------------------------------
-- 3) contacts.stage: enum → texto, y nueva columna pipeline_id
-- ---------------------------------------------------------------------------
ALTER TABLE contacts ALTER COLUMN stage DROP DEFAULT;
ALTER TABLE contacts ALTER COLUMN stage TYPE TEXT USING stage::text;
ALTER TABLE contacts ALTER COLUMN stage SET DEFAULT 'nuevo';

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_pipeline ON contacts(pipeline_id);

-- ---------------------------------------------------------------------------
-- 4) Función: crear el pipeline por defecto genérico para un workspace
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION seed_default_pipeline(p_workspace UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_pipeline UUID;
BEGIN
  INSERT INTO public.pipelines (workspace_id, name, is_default, position)
  VALUES (p_workspace, 'Pipeline principal', TRUE, 0)
  RETURNING id INTO v_pipeline;

  INSERT INTO public.pipeline_stages
    (pipeline_id, workspace_id, key, label, color, position, is_won, is_lost)
  VALUES
    (v_pipeline, p_workspace, 'nuevo',       'Nuevo',       '#64748b', 0, FALSE, FALSE),
    (v_pipeline, p_workspace, 'contactado',  'Contactado',  '#6366f1', 1, FALSE, FALSE),
    (v_pipeline, p_workspace, 'calificado',  'Calificado',  '#2563eb', 2, FALSE, FALSE),
    (v_pipeline, p_workspace, 'negociacion', 'Negociación', '#f59e0b', 3, FALSE, FALSE),
    (v_pipeline, p_workspace, 'ganado',      'Ganado',      '#10b981', 4, TRUE,  FALSE),
    (v_pipeline, p_workspace, 'perdido',     'Perdido',     '#94a3b8', 5, FALSE, TRUE);

  RETURN v_pipeline;
END $$;

-- ---------------------------------------------------------------------------
-- 5) Trigger: cada workspace nuevo recibe su pipeline por defecto
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION on_workspace_created_seed_pipeline()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM public.seed_default_pipeline(NEW.id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_workspace_seed_pipeline ON workspaces;
CREATE TRIGGER trg_workspace_seed_pipeline
  AFTER INSERT ON workspaces
  FOR EACH ROW EXECUTE FUNCTION on_workspace_created_seed_pipeline();

-- ---------------------------------------------------------------------------
-- 6) Backfill: workspaces existentes sin pipeline
--    - crea el pipeline por defecto
--    - engancha sus contactos a ese pipeline
--    - agrega cualquier etapa "extra" que ya usen sus contactos (ej. del demo:
--      cotizacion, test_drive) para no dejar ningún contacto huérfano.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  w RECORD;
  v_pipeline UUID;
BEGIN
  FOR w IN SELECT id FROM public.workspaces LOOP
    IF NOT EXISTS (SELECT 1 FROM public.pipelines WHERE workspace_id = w.id) THEN
      v_pipeline := public.seed_default_pipeline(w.id);

      UPDATE public.contacts
        SET pipeline_id = v_pipeline
        WHERE workspace_id = w.id AND pipeline_id IS NULL;

      INSERT INTO public.pipeline_stages
        (pipeline_id, workspace_id, key, label, color, position)
      SELECT
        v_pipeline, w.id, s.stage,
        initcap(replace(s.stage, '_', ' ')),
        '#94a3b8',
        100
      FROM (
        SELECT DISTINCT stage
        FROM public.contacts
        WHERE workspace_id = w.id AND stage IS NOT NULL AND stage <> ''
      ) s
      WHERE NOT EXISTS (
        SELECT 1 FROM public.pipeline_stages ps
        WHERE ps.pipeline_id = v_pipeline AND ps.key = s.stage
      );
    END IF;
  END LOOP;
END $$;
