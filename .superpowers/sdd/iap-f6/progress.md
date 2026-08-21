# Ledger — Mini-ola IAP · FASE 6 (T30-T32, panel)

Formato: `T# | estado | commit | gate literal clave`

Repos: `backend` (solo `src/modules/admin/monetization/` + wiring) y `kodi-admin`.
Contexto previo: `backend/.superpowers/sdd/iap/progress.md` (F0-F5, HEAD 03ceb8c).

## Estado

T30 | ✅ hecho (backend) | a46706a…c8f5f32 | `npx jest src/modules/admin/monetization` → Tests: 40 passed, 5 suites · `npx jest --config ./test/jest-e2e.json test/store-admin.e2e-spec.ts` → Tests: 12 passed, 12 total · OpenAPI 321/321 + 577/577 (100/100) · tsc exit=0 · knip sin hallazgos en `store-admin`
  - 7 GET + 5 POST (el plan pedía 6+4). Extras: `GET /flags` (T32 los necesita y `/v1/config/flags` solo publica uno) y `POST /incidents/:id/resolve` ("marcar resuelto" de spec §10, que los 4 POST del plan no cubrían).
  - Desviación: `billing.module.ts` gana 2 exports (`RtdnService`, `PurchaseConfirmService`). Sin eso el panel tendría que reimplementar el applier = segundo escritor de `subscriptions`.
T31 | ✅ hecho | ab47d93…8de8468 | `npx vitest run "app/(panel)/economy/monetization"` → Test Files 2 passed, Tests 8 passed · `npm run ci` → lint 0 errores (8 warnings PREEXISTENTES de react-compiler), typecheck OK, contracts OK, 549 tests, build OK · `npm run gen:types:check` exit=0 · `npx knip` idéntico antes y después (verificado con `git stash -u`)
T32 | ✅ hecho | (mismos commits) | idem — 7 páginas + 12 route handlers BFF

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
- **La vista "Auditoría" de spec §10 no es una página**: es el `AuditLogInterceptor`, y ya existe `/audit-log` en el panel. Las 5 mutaciones nuevas escriben con acciones `monetization.reservation.release`, `monetization.event.reprocess`, `monetization.incident.assign_modules`, `monetization.incident.resolve`, `monetization.dlq.retry`.

## Notas de arranque (leídas antes de codear)

- `store_webhook_events.payload` guarda el purchaseToken **redactado** (spec §6.4) y la fila
  **no persiste el usuario resuelto**. Consecuencia dura para T30: ninguna mutación del panel
  puede reproducir un evento sin antes RECUPERAR el token, y el único lugar donde el token vive
  en claro es `subscriptions.storeTransactionId` / `kokos_purchases.storeTransactionId`.
- `BillingModule` no exporta `RtdnService`, `PurchaseConfirmService` ni `EventLogService`.
