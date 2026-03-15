---
name: Fuentes de datos Google Sheets
description: URLs y estructura de las hojas de Google Sheets para la plataforma de scouting del club
type: reference
---

# Fuentes de Datos - Google Sheets

Spreadsheet base: `2PACX-1vTcd6UXpIKwzscpkPXkst_8oYu4t0FtQz-s2X2PQlmczMI4Mb4UnhtilGIm2O_TmLR_Pivbd-gw7JWH`

## Hojas principales

| Hoja | gid | Descripción |
|------|-----|-------------|
| Externo | 0 | Base de datos de scouting externo - jugadores de otras ligas para detectar |
| Plantel (interno) | 1004139572 | Jugadores del club (vacío hasta asociar club) |
| Seguimiento | 887155501 | Jugadores en seguimiento activo (vacío por ahora) |
| Transfermarkt | 1547930353 | Datos adicionales: agente, imagen, valor mercado, fin contrato |

## Seguimiento - Formas de agregar jugadores

1. **Desde ficha individual** - Botón "Agregar a seguimiento" en PlayerDetailPage (implementado)
2. **Automáticamente** cuando scout guarda reporte/evaluación vinculada a jugador (pendiente)
3. **Manual desde Excel** - el usuario agrega directamente en la hoja (funciona)
4. **Desde página Seguimiento** - botón para agregar (pendiente)

## Implementación técnica

- **Tabla Supabase**: `seguimiento` con player_key, player_name, team, league, etc.
- **Lectura**: Google Sheet (para edición manual)
- **Escritura**: Supabase desde la app
- **Flujo híbrido**: App escribe a Supabase, se puede sincronizar a Sheet manualmente

## Notas

- Los datos de Transfermarkt se matchean por nombre + equipo (más preciso)
- Columnas nuevas: `Valor Mercado €`, `Fin Contrato`, `Agente`, `URL Imagen`
- Algunos jugadores no tienen valor de mercado (no encontrados en TM)
