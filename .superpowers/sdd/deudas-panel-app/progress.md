# Deudas menores panel + app — ledger

Formato: `deuda | estado | commit | gate literal`

## Panel

D4 kill-switch server-side | hecho | d356f0a | texto corregido: el backend tambien rechaza abrir compra nueva (PurchasesEnabledGuard en purchase-intent.controller.ts:125 y kokos-packs.controller.ts:83)
D2 globalScopeRequired | hecho | 1465149 | RED literal 8 failed/10 passed -> GREEN 18/18 (permissions.test.ts). 8 acciones agregadas: rewards/energy/mission/store/referral/achievement-regrant/kokos-pack/subscription-price :write. NO se agrego economy:achievement:write (el backend corta in-handler solo sobre campos economicos, para no bloquear al editor en lo cosmetico)
D3 cadencia misiones backend | hecho | (backend) | RED literal where:{} -> GREEN 19/19 + tsc 0. DTO acepta cadence y COMPLETA el enum de type (faltaban maintain_streak y play_with_friend: filtrar por ellos daba 400)
D3 cadencia misiones panel | hecho | bc34681 | columna Badge + filtro Select; tsc 0
D1 hooks a fetchJson | hecho (85/89) | 6477693, 82e5f99, d365ad7, baede13, b7ec6cc, 7819fe1, 5e8cbc3 | 7 tandas, tsc 0 tras cada una. Los `send` helpers que estaban en el mismo archivo pasaron a throwApiError (asi el 401 tambien llega tipado en mutations)

### D1 pendiente
use-missions.ts (4 ocurrencias) BLOQUEADA por B13: ese agente esta agregando iconUrl a misiones en los 3 repos. Retomar cuando libere.

## App

D5 `.value` -> `.get()/.set()` | NO SE HACE | - | veredicto abajo
D6 de-merge multi-sub | hecho | b06a9fd (frontend) | RED por modulo inexistente -> GREEN 9/9 (subGroups.test.ts); planes 63/63; tsc 0; eslint 0; fingerprint 8e6af0033bb92dfecd325ae817c4d51e2e82c335 IDENTICO

### D5 — veredicto: NO hacerlo
- Reanimated **4.5.1** instalado.
- `value` sigue siendo propiedad de primera clase en `interface SharedValue` (commonTypes.d.ts), declarada JUNTO a `get()`/`set()`, **sin `@deprecated`**.
- `npx tsc --noEmit` -> **0** menciones de deprecacion. `npx jest` -> **0**.
- 811 ocurrencias en src/ + app/.
Conclusion: es puramente estilistico. 811 cambios mecanicos en codigo de animaciones (delicado, dificil de testear) sin un solo warning que los justifique = riesgo sin beneficio.

### D6 — que se hizo y que NO
HECHO: `subGroups.ts` agrupa las filas vivas por (plan, periodo) = la compra real de Play, con su pack = cantidad de filas. Antes `currentSub` fusionaba TODAS las filas en una config sintetica (plan = el de mayor rango, pack = total de filas), que con Plus en A y Pro en B afirmaba un Pro de pack 2 sobre A y B.
`subBeingChanged` devuelve la unica suscripcion si hay una sola, y `null` si hay varias -> el cambio sigue fallando seguro (no reemplaza la equivocada, H-07).
`unavailableIds` pasa a `coveredModuleIds` (TODAS las subs vivas): con currentSub=null los modulos de otras subs seguian apareciendo disponibles.

NO HECHO (decision de producto, escalada al founder): la UI para que el usuario ELIJA cual suscripcion esta cambiando cuando tiene 2+. Sin eso, un usuario multi-sub sigue sin poder cambiar de plan desde la app (ve el flujo abortado). Opciones planteadas en el reporte.

## Nota de proceso
Dos ediciones mias salieron mal y las corregi en el momento: un comentario huerfano en use-referrals y codigo muerto en use-store (dejaba el return viejo tras el nuevo). Ambas quedaron limpias y verificadas por tsc antes de commitear.

## CIERRE (tras liberarse B13)

D1 hooks a fetchJson | **COMPLETA 89/89** | + 3ee52d6 | `grep "if (!res.ok) throw new Error(" hooks/*.ts | wc -l` -> **0**
- use-missions.ts (4) migrado una vez que B13 liberó el archivo.
- use-tx-templates.ts preview: el `throw new Error(body.error?.message)` pasó a `throwApiError`, que extrae el MISMO mensaje literal del envelope (UNKNOWN_TEMPLATE_VAR sigue llegando al admin) y además suma el status.
- Verificado que el filtro de cadencia NO quedó duplicado con el del otro fork: 1 solo Select en missions-table.tsx.

## GATES FINALES
- **Panel**: `npm run ci` **exit 0** · `npx vitest run` **569/569 (56 archivos)** · `gen:types:check` **exit 0** y sin drift · `tsc` 0
- **App**: `tsc` **0** · `npx jest --ci` **1464/1464 (186 suites)** · eslint **0 errores** en lo tocado · fingerprint **8e6af0033bb92dfecd325ae817c4d51e2e82c335** IDÉNTICO

## D6 CERRADA — selector de suscripción (decisión founder: opción a)

D6 selector | hecho | 0f196b3 (frontend) | RED literal 6 failed/10 passed -> GREEN 16/16 (subGroups) + 4/4 (SubChoiceSheet); planes 74/74; tsc 0; eslint 0; fingerprint 8e6af0033bb92dfecd325ae817c4d51e2e82c335 IDENTICO

Como quedo:
- `subGroupKey(group)` = `plan|periodo`, la identidad del PRODUCTO de Play. No posicional: el orden cambia entre renders y una clave por indice elegiria la equivocada.
- `needsSubChoice(groups)` = hay 2+ -> preguntar.
- `subBeingChanged(groups, chosenKey)`: con 1 sola devuelve esa SIN preguntar (caso de todos los usuarios hoy, sin friccion nueva); con varias, la elegida; `null` mientras no elija Y TAMBIEN si la clave elegida ya no matchea ninguna viva (vencio con la pantalla abierta) -> el "falla seguro" se mantiene como red.
- `SubChoiceSheet`: AppBottomSheet (wrapper estandar), una fila por suscripcion con "Plus · Anual" + los modulos por NOMBRE ("UCR · COSEVI"), nunca ids. Tokens del tema, sin reorganizar el layout de /planes.
- El sheet solo aparece en modo cambio (`?change=1`): comprar una sub NUEVA no depende de cual vigente estes mirando.
- Cerrar sin elegir hace `router.back()`: quedarse con el objetivo sin fijar solo ofreceria un cambio que no puede confirmarse.
- `replaceProductIdHint` deriva de `currentSub`, que ahora ES la elegida -> el replace apunta a su token, no al primero de la lista.
- Modelo respetado: cambiar = solo tier; los modulos del grupo elegido son fijos; agregar modulo sigue siendo upgrade de pack por su flujo aparte; sin swap.

CHEQUEO VISUAL AGREGADO:
7. Con UNA sola suscripcion, Perfil -> Cambiar plan entra directo como siempre (sin sheet nuevo).
8. Con DOS (ej. Plus anual en UCR+COSEVI y Pro mensual en TEC): al entrar aparece "¿Cual queres cambiar?" con las dos descritas por plan, periodo y modulos. Elegir una deja la pantalla operando SOBRE ESA. Cerrar el sheet sin elegir vuelve a Perfil sin efectos.
