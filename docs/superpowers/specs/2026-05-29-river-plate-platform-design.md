# River Plate — Plataforma Institucional de Scouting

**Fecha:** 2026-05-29  
**Proyecto origen:** club-nombredelclub (Lanús)  
**Proyecto destino:** club-riverplate (nueva carpeta en escritorio)  
**Enfoque:** Fork + Rebrand

---

## 1. Objetivo

Crear una plataforma institucional de scouting para River Plate, replicando la funcionalidad completa del proyecto Lanús (excepto chat IA) con branding profesional de River Plate y datos dinámicos desde API-Football.

## 2. Branding

| Elemento | Valor |
|----------|-------|
| Color primario | Rojo River `#CD1E2B` |
| Color hover | `#E02535` |
| Color dark | `#1A1A1A` |
| Blanco | `#FFFFFF` |
| Logo | Escudo River Plate (copiar de `/escudos/argentina/river.png` → `/river-escudo.png`) |
| Identidad | Banda diagonal roja como motivo visual |
| Tipografía | SF Pro / system fonts (sin cambios) |

### Tailwind Theme

```
brand-green → brand-red: #CD1E2B
brand-greenHover → brand-redHover: #E02535
brand-dark: #1A1A1A (sin cambios)
```

Renombrar todas las referencias `brand-green` → `brand-red` en tailwind.config.js y en todos los componentes.

## 3. Infraestructura

| Servicio | Config |
|----------|--------|
| Supabase URL | `https://zetwitxcsqsrxrstfwls.supabase.co` |
| Supabase Anon Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...pxKx2gi_FyHzTHv6Mi0s8O6Pdww4ZQRDjDXREU5461Y` |
| Supabase Service Role | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...XlPi2_aPD3AwJmYl5tEnQC1XgrfosIBaXJq_SSA6nLo` |
| API-Football Key | `0a19133a26e831fd2e61488b18e2a1d0` |
| Deploy | Netlify (nuevo site) |
| Puerto dev | `5173` (distinto al 5180 de Lanús para poder correr ambos) |

### Variables de entorno (.env.local)

```env
VITE_SUPABASE_URL=https://zetwitxcsqsrxrstfwls.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpldHdpdHhjc3Fzcnhyc3Rmd2xzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTE3MjMsImV4cCI6MjA5NTYyNzcyM30.pxKx2gi_FyHzTHv6Mi0s8O6Pdww4ZQRDjDXREU5461Y
API_FOOTBALL_KEY=0a19133a26e831fd2e61488b18e2a1d0
```

## 4. Datos del club

### Fuente principal: API-Football

- **Team ID:** Buscar River Plate Argentina en la API
- **Endpoints a integrar:**
  - `/players/squads?team={id}` — Plantel completo
  - `/fixtures?team={id}&season=2026` — Calendario y resultados
  - `/fixtures/statistics` — Stats por partido
  - `/standings?league={id}&season=2026` — Posiciones
  - `/teams/statistics` — Estadísticas del equipo
- **Competencias:** Liga Argentina, Copa Argentina, Copa Libertadores (buscar league IDs)

### Fuentes complementarias

- **FotMob:** Team ID de River (buscar) — standings, match data
- **Google Sheets:** Mismas que Lanús para scouting externo (datos genéricos de ligas)
- **`river2026.ts`:** Archivo local con datos de partidos de la temporada (reemplaza `lanus2026.ts`)

### Datos locales

- `/data/plantel-primera.csv` → Datos del plantel de River (generar desde API o placeholder)
- `/data/plantel-interno.csv` → Ídem
- `/data/arqueros-plantel.csv` → Ídem

## 5. Páginas (17 rutas)

| Ruta | Componente | Cambios necesarios |
|------|-----------|-------------------|
| `/` | DashboardPage | Branding River, datos de API-Football |
| `/scouting` | ExternalScoutingPage | Sin cambios funcionales |
| `/plantel` | InternalScoutingPage | Plantel River desde API-Football |
| `/seguimiento` | MonitoringPage | Supabase nuevo |
| `/analisis` | EquipoPage | `river2026.ts`, stats River |
| `/calendario` | CalendarPage | Fixtures River desde API-Football |
| `/comparacion` | ComparisonPage | Sin cambios |
| `/formacion` | FormationPage | Supabase nuevo |
| `/oportunidades` | OpportunitiesPage | Sin cambios |
| `/similares` | SimilarPlayersPage | Sin cambios |
| `/jugador/:id` | PlayerDetailPage | Sin cambios |
| `/dispersion` | ScatterChartPage | Sin cambios |
| `/evaluar` | ScoutEvaluationPage | Supabase nuevo |
| `/evaluaciones` | EvaluationsAdminPage | Supabase nuevo |
| `/radar` | RadarAnalysisPage | Sin cambios |
| `/inferiores/equipos` | ArmadoEquiposPage | Supabase nuevo |
| `/videoanalisis` | VideoanalisisPage | Supabase nuevo |

## 6. Qué se elimina

- `src/components/chat/AIAnalystChat.tsx` — Chat IA completo
- `src/services/rivalAnalysisService.ts` — Depende de Claude API
- Proxy Anthropic en `vite.config.ts`
- `netlify/functions/analyze-rival.js` — Function de análisis IA
- Toda referencia a `ANTHROPIC_API_KEY`
- Cualquier import/render de AIAnalystChat en páginas

## 7. Qué se mantiene idéntico

- Sistema de scoring (ggScore, SCORING_CONFIG, RADAR_METRICS)
- Filtros (FilterSidebar, MobileFilterPanel)
- PDF Builder (PDFBuilderContext, PDFBuilderModal)
- Video Análisis (Wyscout XML parser, acordeón de eventos)
- Autenticación Supabase (AuthContext, AuthModal)
- Dark/Light mode (ThemeContext, ThemeToggle)
- Escudos de equipos rivales (toda la carpeta `/escudos/`)
- CSV Service para Google Sheets externas
- ExportPDFModal, charts (Recharts), comparaciones

## 8. Renombramientos globales

| De | A |
|----|---|
| `brand-green` | `brand-red` |
| `#6F1929` (granate) | `#CD1E2B` (rojo River) |
| `#8B2234` (hover) | `#E02535` (hover River) |
| `lanus-escudo.png` | `river-escudo.png` |
| `lanus-logo.png` | `river-logo.png` |
| `lanus2026.ts` | `river2026.ts` |
| `club-nombredelclub` | `club-riverplate` |
| FotMob team ID 10082 | FotMob team ID River |
| Puerto 5180 | Puerto 5173 |

## 9. Supabase — Tablas necesarias

Crear en la nueva instancia:

- `seguimiento` — Tracking de jugadores
- `formations` — Formaciones guardadas
- `comments` — Comentarios en jugadores
- `video_analysis` — Registros de video
- `scout_evaluations` — Evaluaciones de scouting
- `score_history` — Historial de puntajes

(Esquemas idénticos al proyecto Lanús)

## 10. Netlify Functions

Copiar y adaptar:

| Function | Cambios |
|----------|---------|
| `sheets.js` | Sin cambios |
| `fotmob-league.js` | Sin cambios |
| `fotmob-match.js` | Sin cambios |
| `fotmob-team.js` | Sin cambios |
| `apifootball.js` | API key de River |
| `promiedos.js` | Sin cambios |
| `update-lineup.js` | Sin cambios |
| ~~`analyze-rival.js`~~ | **ELIMINAR** |

## 11. Git

- `git init` nuevo en `club-riverplate`
- Commit inicial: "fork: River Plate platform from Lanús base"
- `.gitignore` copiado + asegurar `.env.local` excluido
- Sin relación con el repo de Lanús

## 12. Orden de implementación (alto nivel)

1. Copiar proyecto a nueva carpeta
2. Git init + limpieza (eliminar chat IA, refs Anthropic)
3. Rebrand visual (colores, logos, nombres)
4. Configurar Supabase nuevo + crear tablas
5. Configurar API-Football (team IDs, league IDs)
6. Crear `river2026.ts` con datos de partidos
7. Adaptar servicios (fotmob, standings, calendar) a IDs de River
8. Configurar Netlify functions con nueva API key
9. Crear `.env.local` con todas las credenciales
10. Test completo de todas las páginas
