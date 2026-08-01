# Implementación — Deploy en VPS (Easypanel) + Cerebro en n8n

Resumen de los cambios que ya quedaron listos en el código y los pasos que
faltan (los que necesitan tus credenciales). Todo el código **typechea limpio**
(`tsc --noEmit` sin errores) y el workflow n8n es JSON válido e importable.

---

## 1. Qué cambié

### Fase 1 — Preparar para self-host (sacar Vercel)
- **`next.config.ts`** → agregado `output: "standalone"` (imagen Docker liviana).
- **`Dockerfile`** (nuevo) → multi-stage Next 16 standalone, Node 20, corre con `node server.js`.
- **`.dockerignore`** (nuevo).

### Fase 6 — Cerebro en n8n (opcional por workspace)
- **`supabase/migrations/20260801000000_n8n_provider.sql`** (nuevo) → agrega `n8n` al enum `integration_provider`.
- **`src/features/inbox/services/n8n-agent.ts`** (nuevo) → resuelve la integración, arma `media[]` con **signed URLs** de Supabase Storage, y llama al webhook de n8n. Contrato de respuesta: `{ text, actions? }`.
- **`src/features/inbox/services/buffer.ts`** (editado) → branch en `processNextBatch`: si el workspace tiene la integración `n8n` habilitada, n8n genera la respuesta; si no, usa el motor interno (fallback intacto). Se conserva `decide()` como gate y `dispatchText()` como única salida (guardas de 24h/opt-out, persistencia e inbox siguen funcionando). Se agregó `applyN8nActions()` que mapea `handoff / add_tag / send_template / set_stage` a las funciones existentes.
- **`n8n/agente-whatsapp-starter.json`** (nuevo) → workflow de arranque importable.

> El cambio es **reversible y aislado**: si no creas la integración `n8n`, todo sigue igual con el motor interno.

---

## 2. Pasos que faltan (con tus credenciales)

### A) Supabase (cuando crees la cuenta nueva)
1. `supabase link` al proyecto nuevo y `supabase db push` (aplica todas las migraciones, incluida la de `n8n`).
2. Confirma extensiones: `pg_cron`, `pg_net`, `vector`.
3. Auth → URL Configuration → Site URL y Redirect = `https://app.tudominio.com`.

### B) Easypanel (deploy de la app)
Crea la App desde tu fork (build por Dockerfile). Variables:

**Build args** (van al bundle del cliente, obligatorios en build):
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL   = https://app.tudominio.com
```

**Runtime env** (secretos, se leen al ejecutar):
```
SUPABASE_SERVICE_ROLE_KEY
ENCRYPTION_KEY   (+ ENCRYPTION_KEY_VERSION)
BUFFER_PROCESS_SECRET
CRON_SECRET
NODE_ENV = production
# OPENROUTER_API_KEY solo si vas a usar KB/embeddings en la app; el agente va por n8n.
```
> Nota: los `NEXT_PUBLIC_*` se hornean en build. Si cambias el dominio, rebuild.

### C) Cron del buffer (pg_cron → tu VPS)
En el SQL Editor de Supabase corre `supabase/cron/*.sql` reemplazando la URL por `https://app.tudominio.com/api/cron/buffer-flush` y tu `CRON_SECRET`. Verifica con `select * from cron.job;`.

### D) Conectar n8n como cerebro
1. En n8n importa `n8n/agente-whatsapp-starter.json`.
2. En n8n define dos **env vars**: `OPENAI_API_KEY` (tu key de OpenAI) y `AGENT_SECRET` (un secreto que tú inventes).
3. Activa el workflow y copia la **URL del webhook de producción**.
4. En Supabase (SQL Editor) crea la integración para tu workspace:
```sql
insert into integrations (workspace_id, provider, enabled, credentials, config)
values (
  'TU_WORKSPACE_ID',
  'n8n',
  true,
  jsonb_build_object('secret', 'EL_MISMO_AGENT_SECRET'),
  jsonb_build_object('webhook_url', 'https://n8n.tudominio.com/webhook/agente-whatsapp')
)
on conflict (workspace_id, provider)
do update set enabled = true,
  credentials = excluded.credentials,
  config = excluded.config;
```
5. Manda un mensaje de prueba → ahora responde **n8n**.

---

## 3. Notas / pendientes

- **Apaga el setter interno** (no dejes un agente activo tipo `setter`) para no pagar doble LLM; la calificación la hará n8n.
- **Media (voz/imagen):** el starter es *text-first*. La app ya te pasa `media[]` con `signed_url`; en n8n agrega el branch que baja el archivo y lo transcribe (Whisper) / describe (visión). Hay un comentario marcando dónde, en el nodo "Validar + armar mensajes".
- **`set_stage`:** hoy escribe en `contacts.stage` (columna existente). Si luego agregas la columna `stage` de pipeline en `conversations` (lo que hablamos del funnel), ajusta `applyN8nActions` para apuntar ahí.
- **App ↔ n8n en el mismo Easypanel:** puedes usar la red interna para el `webhook_url` (más rápido). El cron de Supabase sí llega por HTTPS público.
- **Autenticación:** el header `X-Agent-Secret` que manda la app debe igualar `AGENT_SECRET` en n8n (el workflow lo valida y tira error si no coincide).

---

## 4. Verificación local (opcional, antes de push)
```bash
npm ci
npx tsc --noEmit          # ya pasa limpio
docker build -t whatsapp-saas .   # confirma que la imagen compila
```
