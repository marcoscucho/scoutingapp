---
name: Actualización de ligas marzo 2026
description: Nueva estructura de ligas en la base de datos de scouting externo con 12 ligas sudamericanas y mexicana
type: project
---

Base de datos actualizada el 2026-03-14 con las siguientes ligas:

| Liga | Jugadores | Tier |
|------|-----------|------|
| Liga Argentina | 539 | 1 |
| 2° Argentina | 513 | 3 |
| Liga MX | 473 | 1 |
| Liga Colombia | 427 | 2 |
| Liga Brasil | 394 | 1 |
| B Metro (3° Arg) | 369 | 4 |
| 2° Colombia | 350 | 3 |
| Liga Uruguay | 313 | 2 |
| Liga Paraguay | 299 | 2 |
| Liga Chile | 299 | 2 |
| 2° Chile | 264 | 3 |
| Liga Ecuador | 257 | 2 |

**Why:** Se expandió la cobertura de scouting para incluir más mercados accesibles (Ecuador, México, Brasil, divisiones inferiores).

**How to apply:**
- Actualizar ORDERED_LEAGUES en scoring.ts
- Considerar implementar factor de ajuste por nivel de liga para que scorings sean comparables entre divisiones
- Ligas tier 1 (primera división top) no necesitan ajuste
- Ligas tier 2-4 podrían necesitar penalización en scoring
