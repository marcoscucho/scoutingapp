---
name: Sistema de Scoring ggScore
description: Documentación del algoritmo de scoring por posición - normalización dentro del grupo y pesos por métrica
type: reference
---

# Sistema de Scoring (ggScore)

## Concepto
Score de 0-100 que indica qué tan bueno es un jugador comparado con otros de su misma posición en el dataset.

## Fórmula

```
ggScore = Σ (valorNormalizado × peso/100)

donde:
  valorNormalizado = (valorJugador - minPosición) / (maxPosición - minPosición) × 100
```

## Algoritmo

1. **Agrupar** jugadores por posición normalizada (usando POSITION_MAP)
2. **Calcular MIN/MAX** de cada métrica dentro del grupo de posición
3. **Normalizar** cada métrica del jugador de 0-100 dentro de su grupo
4. **Aplicar pesos** según SCORING_CONFIG (los pesos suman 100 por posición)
5. **Resultado**: Score ponderado de 0-100

## Pesos por posición (SCORING_CONFIG en scoring.ts)

Cada posición tiene métricas específicas con pesos que reflejan su importancia:

- **Defensor Central**: Énfasis en duelos (44%), pases progresivos (13%), carreras (11%)
- **Lateral**: Balance ataque/defensa - gambetas (8%), xA (8%), duelos (15%)
- **Volante central**: Pases progresivos (18%), duelos (30%), pases adelante (26%)
- **Volante interno**: Mixto - ataque (xA 7%, xG 7%) + defensa + creación
- **Extremo**: Gambetas (11%), xA (11%), goles (11%), duelos ataque (11%)
- **Delantero**: Goles (37%), duelos aéreos (17%), gambetas/duelos ataque

## Multiplicadores por Tier de Liga

| Tier | Ligas | Multiplicador |
|------|-------|---------------|
| S | Premier, La Liga, Bundesliga, Serie A | 1.10 - 1.15 |
| A | Ligue 1, Portugal, Eredivisie | 1.03 - 1.08 |
| B+ | Argentina, Brasil, México | 1.00 |
| B | Colombia, Uruguay, Bélgica, Turquía | 0.95 - 0.98 |
| B- | Chile, Paraguay, MLS, Championship | 0.92 - 0.95 |
| C+ | Ecuador, Perú, 2° top 5 Europa | 0.85 - 0.90 |
| C | 2° Sudamérica, ligas menores Europa | 0.78 - 0.85 |
| D | 3° divisiones | 0.65 - 0.75 |

**Para nuestras ligas:**
- B+ (1.00): Liga Argentina, Liga Brasil, Liga MX
- B (0.96): Liga Colombia, Liga Uruguay
- B- (0.93): Liga Chile, Liga Paraguay
- C+ (0.87): Liga Ecuador
- C (0.82): 2° Argentina, 2° Colombia, 2° Chile
- D (0.70): B Metro (3° Arg)

## Notas importantes

- La normalización es DENTRO del grupo de posición, no global
- Si max = min, se asigna 50 (neutro)
- El score es relativo al dataset actual - puede cambiar al agregar jugadores
- El multiplicador de liga se aplica al score final
