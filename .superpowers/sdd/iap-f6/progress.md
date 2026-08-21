# Ledger — Mini-ola IAP · FASE 6 (T30-T32, panel)

Formato: `T# | estado | commit | gate literal clave`

Repos: `backend` (solo `src/modules/admin/monetization/` + wiring) y `kodi-admin`.
Contexto previo: `backend/.superpowers/sdd/iap/progress.md` (F0-F5, HEAD 03ceb8c).

## Estado

T30 | ✅ hecho (backend) | a46706a…c8f5f32 | `npx jest src/modules/admin/monetization` → Tests: 40 passed, 5 suites · `npx jest --config ./test/jest-e2e.json test/store-admin.e2e-spec.ts` → Tests: 12 passed, 12 total · OpenAPI 321/321 + 577/577 (100/100) · tsc exit=0 · knip sin hallazgos en `store-admin`
  - 7 GET + 5 POST (el plan pedía 6+4). Extras: `GET /flags` (T32 los necesita y `/v1/config/flags` solo publica uno) y `POST /incidents/:id/resolve` ("marcar resuelto" de spec §10, que los 4 POST del plan no cubrían).
  - Desviación: `billing.module.ts` gana 2 exports (`RtdnService`, `PurchaseConfirmService`). Sin eso el panel tendría que reimplementar el applier = segundo escritor de `subscriptions`.
T31 | ✅ hecho | ab47d93…80459aa | `npx vitest run "app/(panel)/economy/monetization"` → Test Files 2 passed, Tests 8 passed · `npm run ci` → lint 0 errores (8 warnings PREEXISTENTES de react-compiler), typecheck OK, contracts OK, 549 tests, build OK · `npm run gen:types:check` exit=0 · `npx knip` idéntico antes y después (verificado con `git stash -u`)
T32 | ✅ hecho | (mismos commits) | idem — 7 páginas + 12 route handlers BFF

REV | ✅ hecho | backend `a346063…fc20056` · panel `f4d456d…` | **dos revisores Opus independientes** (uno por repo). 2 Critical + 11 Important reales; corregidos todos menos dos, documentados abajo.

### Backend — hallazgos corregidos
- **Critical (mitigado, con abierto)**: el e2e de la auditoría era FLAKY (3 de 5 corridas rojas). Causa: `AuditLogInterceptor` inserta **fire-and-forget** (`tap` + `.catch(Sentry)`), así que el 201 vuelve antes de que exista la fila. El e2e ahora espera con `waitForAudit`; **el invariante de fondo sigue abierto** (ver K16).
- **Important**: `founderOffer` resolvía la oferta con `isActive: true` a secas, distinto del predicado que usa el pipeline para apartar cupos (`buildActiveOfferWhere`, que además honra `startsAt`/`endsAt`). Con dos ofertas activas, el panel mostraba los contadores de una oferta distinta de la que se está llenando. Ahora usa la misma función.
- **Important**: la serie diaria **nunca incluía el día de hoy** (buckets de D-30 a D-1) y agrupaba en UTC sobre un producto en UTC-6, así que todo movimiento posterior a las 18:00 CR caía en un bucket inexistente y se perdía en silencio. Ahora la ventana termina hoy y `dayKey`/`startOfDay` trabajan en hora de CR.
- **Important**: `kokos_negativo` salía de `negativeKokos.length` con `take: 100` → el panel reportaría "100" para siempre justo cuando el clawback se desmadró. Ahora sale de un `count`; el listado sigue acotado y el panel dice de cuántos.
- **Important**: un evento que quedaba en `received` porque el proceso murió entre el UPDATE y el pipeline no tenía salida (`EVENT_IN_FLIGHT` para siempre, alerta de 15 min encendida, sin Pub/Sub que reentregue). Ahora una fila `received` más vieja que el umbral de atascado sí se puede reprocesar.
- **Critical (ya corregido antes del informe)**: `reprocessEvent` no restauraba `lastError` al fallar → borraba la marca del drenaje y el evento desaparecía de la vista DLQ para siempre.
- **Important (ya corregido antes del informe)**: `z.coerce.boolean()` hacía que `?isActive=false` filtrara por `true`; y `country` como `z.array()` rebotaba con 400 el caso normal `?country=CR`.
- Tests agregados: reproceso REAL contra Postgres (recibo recuperado de la compra, pipeline completo, misma fila, sin token en la respuesta), filtro de país suelto, día de hoy en la serie, contador de Kokos, evento atascado.

### Panel — hallazgos corregidos
- **Critical**: el filtro de país de Reservas mandaba un contrato que el backend rechazaba (400 en toda la tabla). Cerrado del lado del backend (`country` suelto) + e2e que lo prueba.
- **Important**: `post()` no desenvolvía el envelope y el toast decía `"Reprocesar: listo"` sobre un evento que podía seguir roto. Ahora pasa por `fetchJson`, las mutaciones están tipadas y el aviso dice el RESULTADO ("Reprocesado · ahora está en …", "Cupo devuelto al pool · quedan N apartados").
- **Important**: cinco de las siete vistas daban 403 a un admin regional (y a un comercial) y la portada las enlazaba igual. Acciones nuevas `economy:store-ops:read` (admin, con país) y `economy:store-ops:global` (admin global); la portada filtra por `canWithScope`.
- **Important**: el CSV de reservas no llevaba BOM (Excel rompía los acentos), no saneaba inyección de fórmulas (`=`/`+`/`-`/`@` en un nombre de usuario) y decía "Exportar CSV" exportando solo la página. Los tres corregidos.
- **Important**: `max-w-2xl` en el visor de payload lo dejaba en 384 px (el primitivo trae `sm:max-w-sm` y la variante responsive gana). Ahora `sm:max-w-2xl`.
- **Important**: la paginación de Incidencias colgaba de la tabla equivocada y las 5 tarjetas de conteo no filtraban nada. Ahora paginan donde corresponde y las tarjetas son filtros.
- **Diseño (REGLA #1)**: la portada era "siete cards uniformes sin jerarquía". Ahora ordena por urgencia — incidencias abiertas y DLQ arriba **con su contador real**, operación en el medio, referencia abajo — y el `why` de cada incidencia pasó de párrafo repetido ×5 a tooltip.
- Tests corregidos: los de "disponibles" ejercitaban una rama de fallback que en prod nunca corre; ahora pinchan el `slotsAvailable` que manda el backend. Se agregó el test de payload de asignar módulos que T32 pedía por nombre.

### NO corregidos a propósito
- **`resolveIncident` sobre un `pending_module_selection` abierto no tiene vuelta atrás.** Cerrarla deja al panel sin su herramienta para esa compra. Se verificó que el usuario **sí** puede seguir eligiendo desde la app (`confirm` no lee `store_webhook_events` para decidir el sheet), así que el daño queda acotado al panel; el diálogo ahora lo dice literal. Agregar un `reopen` es una 6ª mutación fuera del encargo.
- **`ReprocessResult` no distingue "se aplicó" de "se descartó por viejo"**: `RtdnService.handle` devuelve `void` y propagar el `skipped` obliga a cambiar su firma, o sea tocar `billing/`.
- **`recoverPurchaseToken` son dos seq scans con sha256 por fila.** Un índice funcional lo resuelve, pero es una migración sobre `subscriptions` y esta fase no crea migraciones. Es una acción manual del panel, no un handler de webhook. Ver K17.
- **Dos admins reprocesando el mismo evento a la vez** corren el pipeline en paralelo. El applier serializa por advisory lock de sha, así que no corrompe datos; duplica `attempts` y llamadas a Google.

## Desviaciones

1. **`billing.module.ts` exporta `RtdnService` y `PurchaseConfirmService`** (el encargo decía no tocar `billing/`). Sin eso, `reprocessEvent` y `assignModules` tendrían que reimplementar el applier dentro de `admin/monetization/` = segundo escritor de `subscriptions`, que es exactamente lo que la ola entera evita. Son 2 líneas de `exports`, sin cambio de comportamiento.
2. **12 endpoints, no 10.** Extras: `GET /flags` (T32 pide una vista de kill-switches y `/v1/config/flags` solo publica `iap_purchases_enabled`) y `POST /incidents/:id/resolve` ("marcar resuelto" de spec §10, que los 4 POST del plan no cubrían y que es la única acción que SIEMPRE puede cerrar una incidencia).
3. **`reprocess`, `dlq/retry` y `incidents/:id/modules` dependen de recuperar el recibo.** Spec §6.4 prohíbe guardar el purchaseToken y `store_webhook_events` tampoco guarda el usuario resuelto. El único lugar donde el recibo vive en claro es `subscriptions.storeTransactionId` / `kokos_purchases.storeTransactionId`, así que se recupera por sha256 en SQL. **Cuando la compra nunca escribió filas —que es el caso de casi todo `unmapped`/`unresolved`/`pending_module_selection` de una PRIMERA compra— no hay de dónde y el endpoint devuelve 422 `PURCHASE_TOKEN_UNRECOVERABLE`.** Se prefirió decirlo antes que fingir un reproceso. Ver K14.
4. **La vista DLQ lee `store_webhook_events` con `lastError LIKE '%descartado por la DLQ%'`**, no la cola de Pub/Sub. `DlqDrainJob` ya hace `acknowledge` de cada mensaje, así que después del drenaje la cola está vacía; y `store_webhook_events` no tiene columna de origen (agregarla es tocar `billing/`).
5. **El botón "correr sync en dry-run" del catálogo de SKUs queda deshabilitado**: el script `play-catalog-sync.ts` es de la Fase 8 y todavía no existe.
6. **`@testing-library/user-event` no está instalado** en kodi-admin: el test de incidencias usa `fireEvent` (prior art del repo).
7. **`types/api.ts` traía drift PREEXISTENTE de F0-F5** (nadie regeneró desde que el backend agregó los endpoints de la ola): el commit de regeneración trae 905 inserciones, no solo las de F6.

## Abiertos que hereda F7+

- **K14 · la asignación manual de módulos casi nunca va a poder correr.** Necesita el purchaseToken y el usuario resuelto, y `store_webhook_events` no guarda ninguno de los dos. Para que sea real hacen falta dos cambios en `billing/`: una columna `resolvedUserId` en el evento y una forma de recuperar el recibo (p. ej. persistir el sha en `subscriptions` con índice, o el propio `PurchaseIntent`). Hoy la recuperación real del usuario es el sheet de la app (T36) y el panel solo puede cerrar la incidencia.
- **K10 cerrado a medias**: "Compras recientes" muestra los eventos del webhook. Una compra confirmada por el atajo de la app (`purchases/confirm`) sigue sin dejar fila, y una compra de Kokos por el atajo tampoco — el rastro de esa última es `kokos_purchases`, que esta fase NO expone como vista propia (se ve el `onetime:1` de Play en Compras recientes).
- **K12 cerrado**: los saldos de Kokos negativos por clawback tienen vista en Incidencias.
- **K16 · la auditoría del panel es best-effort, no garantía.** `AuditLogInterceptor` escribe la
  fila FUERA del ciclo de la respuesta (`tap` + `.catch(Sentry)`): si el proceso muere entre el
  200 y el insert, un admin liberó un cupo o reasignó una compra pagada y **no queda rastro**. Es
  preexistente y afecta a las ~220 rutas admin, no solo a estas cinco, así que arreglarlo
  (`concatMap` en vez de `tap`) es una decisión de alcance mayor. Se documenta porque en esta área
  la auditoría ES la vista de Auditoría de spec §10.
- **K17 · la recuperación del recibo escanea `subscriptions` y `kokos_purchases` enteras**
  calculando sha256 por fila (no hay índice funcional). Hoy son pocas filas y es una acción manual;
  con padrón grande el click del panel se va a segundos. Salida: índice funcional
  `CREATE INDEX CONCURRENTLY ... ON subscriptions ((encode(sha256(convert_to("storeTransactionId",'UTF8')),'hex')))`.
- **La vista "Auditoría" de spec §10 no es una página**: es el `AuditLogInterceptor`, y ya existe `/audit-log` en el panel. Las 5 mutaciones nuevas escriben con acciones `monetization.reservation.release`, `monetization.event.reprocess`, `monetization.incident.assign_modules`, `monetization.incident.resolve`, `monetization.dlq.retry`.

## Notas de arranque (leídas antes de codear)

- `store_webhook_events.payload` guarda el purchaseToken **redactado** (spec §6.4) y la fila
  **no persiste el usuario resuelto**. Consecuencia dura para T30: ninguna mutación del panel
  puede reproducir un evento sin antes RECUPERAR el token, y el único lugar donde el token vive
  en claro es `subscriptions.storeTransactionId` / `kokos_purchases.storeTransactionId`.
- `BillingModule` no exporta `RtdnService`, `PurchaseConfirmService` ni `EventLogService`.

## CHECKPOINT F6 — listo para revisión del orquestador

**backend** HEAD=`fc20056` (13 commits sobre `03ceb8c`) · `npx tsc --noEmit` exit=0 · `npx jest` → **2919 passed, 300 suites, 1 snapshot** · `npx jest --config ./test/jest-e2e.json test/store-admin.e2e-spec.ts` → **14 passed** (3 corridas seguidas verdes) · play-rtdn 23 · purchase-confirm 13 · OpenAPI **321/321 + 577/577 (100/100)** · `npx eslint src/modules/admin/monetization test/store-admin.e2e-spec.ts --no-fix` limpio · `npx knip` sin hallazgos nuevos · `npm run build` exit=0 · **ninguna migración nueva** · sin `git push`

**kodi-admin** HEAD tras `🔒 fix: la vista de interruptores exige scope global` (16 commits sobre `2c23429`) · `npm run ci` verde (lint 0 errores / 8 warnings PREEXISTENTES de react-compiler · typecheck · contracts · **552 tests, 55 suites** · build) · `npm run gen:types:check` exit=0 · `npx knip` idéntico antes y después (verificado con `git stash -u`) · sin `git push`

**Nada tocó prod ni Play Console.**
