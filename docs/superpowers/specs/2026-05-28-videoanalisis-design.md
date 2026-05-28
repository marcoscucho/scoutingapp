# Videoanálisis — Design Spec

## Objetivo

Sección nueva en la plataforma donde los videoanalistas del club suben archivos XML exportados desde sus herramientas de botonera (software de videoanálisis). La plataforma parsea el XML, visualiza todos los datos de forma jerárquica y estética, genera insights automáticos por reglas, y permite discusión en hilo de comentarios tipo chat. Se registra qué usuario subió cada archivo.

## Alcance

- Soporte para todas las categorías: Primera, Reserva, 4ta, 5ta, 6ta, 7ma, 8va, 9na, Pre-9na, Femenino
- Dos tipos de sesión: **Partido** (con rival, jornada) y **Entrenamiento** (con contexto libre)
- Partidos y entrenamientos NO se mezclan — tabs separadas dentro de cada categoría
- Persistencia completa en Supabase — los análisis se acumulan fecha a fecha
- Sin referencias a marcas de software específicas en la UI ni en el código

## Rutas

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/videoanalisis` | `VideoanalisisPage` | Listado principal con tabs por categoría |
| `/videoanalisis/:id` | `VideoanalisisDetailPage` | Detalle completo de un análisis |

## Navegación

Nuevo item en `navLinks` del `Navbar.tsx`:
```
{ to: '/videoanalisis', label: 'Videoanálisis', icon: 'video' }
```

## Componentes

### VideoanalisisPage (listado)

**Layout:** Tabla estilo lista con dos niveles de tabs:
- **Nivel 1 (categoría):** Primera | Reserva | 4ta | 5ta | 6ta | 7ma | 8va | 9na | Pre-9na | Femenino
- **Nivel 2 (tipo):** Partidos | Entrenamientos

**Tabla:** Cada fila muestra:
- Nombre del análisis (rival para partidos, título libre para entrenamientos)
- Fecha
- Badge de tipo (Partido / Entrenamiento)
- Cantidad de eventos parseados
- Usuario que subió
- Cantidad de comentarios

**Botón "Subir XML"** arriba a la derecha, abre el modal de carga.

Cada fila es clickeable → navega a `/videoanalisis/:id`.

### UploadXmlModal

Modal centrado que se abre sobre el listado. Contiene:

1. **Zona drag & drop** para el archivo XML (también clickeable para buscar archivo)
2. **Formulario de metadatos:**
   - Categoría (dropdown): Primera, Reserva, 4ta...Femenino
   - Tipo (toggle): Partido | Entrenamiento
   - **Si Partido:** campos Rival (texto) + Jornada/Fecha competitiva (texto)
   - **Si Entrenamiento:** campo Contexto/Descripción (texto)
   - Fecha del partido/entrenamiento (date picker)
3. **Botones:** Cancelar | Subir análisis

Al subir:
- Se parsea el XML en el cliente
- Se valida que tenga estructura reconocible (categorías/eventos)
- Se guarda en Supabase: metadatos + JSON parseado
- Se registra el usuario logueado como autor
- Se redirige al detalle del análisis recién creado

### VideoanalisisDetailPage (detalle)

**Header:**
- Botón "← Volver"
- Título (rival o nombre de entrenamiento)
- Metadata: fecha, categoría, jornada
- Info de subida: "Subido por [usuario] · [fecha relativa]"
- Botón exportar PDF

**Fila de stats resumen:** Tarjetas horizontales con métricas globales extraídas del XML (total eventos, y las categorías principales con sus conteos).

**Acordeón de categorías (`XmlAccordion`):**
- Cada categoría del XML es una sección colapsable
- Header muestra: nombre de categoría + badge con cantidad de eventos
- Al expandir muestra:
  - Sub-eventos con barras de progreso relativas (porcentaje dentro de la categoría)
  - Si hay coordenadas → mini canchita (`MiniPitch`) con los puntos/zonas pintadas
  - Si hay descriptores → tags o detalles adicionales por evento
  - Si hay timestamps → indicación de 1T/2T cuando aplica

**Insights automáticos (`InsightsPanel`):**
- Caja destacada con fondo sutil diferenciado
- Bullets generados por reglas (ver sección Insights)
- Se muestra después de los stats y antes del acordeón, o como bloque fijo

**Hilo de comentarios (`CommentThread`):**
- Al pie de la página
- Cada mensaje: avatar (iniciales), nombre de usuario, texto, timestamp relativo
- Input para nuevo comentario
- Se persiste en Supabase

### MiniPitch (componente reutilizable)

Canchita de fútbol SVG que:
- Dibuja la cancha con líneas (área, mediocampo, círculo central, áreas)
- Acepta un array de coordenadas normalizadas (0-1 en x e y)
- Las renderiza como puntos, zonas de calor, o flechas según el tipo de evento
- Se integra dentro de las categorías del acordeón donde haya coordenadas disponibles

## Servicio: xmlParserService

Parsea XML genérico de herramientas de videoanálisis a una estructura normalizada.

### Estructura de datos normalizada

```typescript
interface ParsedAnalysis {
  categories: ParsedCategory[]
  metadata: Record<string, string>  // cualquier metadata del XML
  totalEvents: number
}

interface ParsedCategory {
  name: string
  events: ParsedEvent[]
  totalCount: number
}

interface ParsedEvent {
  name: string
  count: number
  timestamps: EventTimestamp[] | null
  coordinates: EventCoordinate[] | null
  player: string | null
  zone: string | null
  descriptors: Record<string, string>
  half: 1 | 2 | null  // derivado del timestamp si hay duración de partido
}

interface EventTimestamp {
  start: string  // "HH:MM:SS"
  end: string | null
}

interface EventCoordinate {
  x: number  // 0-1 normalizado
  y: number  // 0-1 normalizado
}
```

### Lógica de parseo

- Usa DOMParser nativo del browser para parsear el XML
- Recorre el árbol buscando nodos que representen categorías (agrupadores) y eventos (hojas con datos)
- Extrae timestamps, coordenadas, jugadores y descriptores de los atributos/hijos de cada evento
- No asume nombres de tags específicos de ninguna marca — detecta la estructura por jerarquía
- Los campos que no existan quedan `null` — la UI se adapta mostrando solo lo disponible

## Insights automáticos (reglas)

Funciones puras que reciben `ParsedAnalysis` y devuelven un array de strings con los insights.

Reglas implementadas:
1. **Distribución por sector:** Si una categoría tiene sub-eventos con "derecha", "izquierda", "centro" → calcula porcentajes y destaca el dominante
2. **Dominancia de tipo:** Dentro de una categoría, si un sub-evento supera el 65% → se marca como predominante
3. **Efectividad:** Si hay sub-eventos de "intento" y "éxito/gol/acierto" → calcula ratio
4. **Comparación 1T vs 2T:** Si hay timestamps y se puede derivar mitad → compara distribución entre tiempos
5. **Alertas de desbalance:** Categorías con distribución muy desigual (>75% concentrado en un sub-tipo)

Cada insight es un string descriptivo: "El 65% de los ataques fueron por sector derecho".

## Persistencia (Supabase)

### Tabla `video_analyses`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK a auth.users — quien subió |
| user_name | text | Nombre del usuario (denormalizado para mostrar rápido) |
| category | text | 'primera', 'reserva', '4ta', ..., 'femenino' |
| type | text | 'partido' o 'entrenamiento' |
| rival | text | null si entrenamiento |
| match_day | text | Jornada/fecha competitiva, null si entrenamiento |
| description | text | Contexto libre (obligatorio para entrenamiento, opcional para partido) |
| date | date | Fecha del partido/entrenamiento |
| parsed_data | jsonb | La estructura ParsedAnalysis completa |
| total_events | integer | Total de eventos (denormalizado para listado) |
| created_at | timestamptz | Timestamp de subida |

### Tabla `video_analysis_comments`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| analysis_id | uuid | FK a video_analyses |
| user_id | uuid | FK a auth.users |
| user_name | text | Nombre del usuario |
| text | text | Contenido del comentario |
| created_at | timestamptz | Timestamp del comentario |

## Flujo completo

1. Usuario navega a `/videoanalisis`
2. Ve el listado filtrado por categoría (tab nivel 1) y tipo (tab nivel 2: Partidos | Entrenamientos)
3. Clickea "Subir XML" → se abre modal
4. Arrastra o selecciona archivo XML
5. Completa: categoría, tipo (partido/entreno), rival/contexto, fecha
6. Clickea "Subir análisis" → se parsea el XML, se guarda en Supabase, se redirige al detalle
7. En el detalle ve: stats resumen, insights automáticos, acordeón de categorías con barras + mini canchitas, hilo de comentarios
8. Puede dejar comentarios que se persisten
9. Otros usuarios ven el análisis en el listado y pueden acceder y comentar

## Estilo visual

- Consistente con el diseño existente: dark mode, colores Lanús (#6F1929), Apple-inspired UI
- Tailwind CSS con las clases y tokens existentes del proyecto
- Animaciones: fade-in, slide-up para el acordeón
- Mini canchitas en SVG con fondo verde oscuro y eventos como puntos/zonas de calor en granate
- Badge Partido (verde) / Entrenamiento (azul) para diferenciar visualmente
