// ─── Team Shield Resolver ─────────────────────────────────────────────────────
// Maps team names (and all known aliases) to local PNG paths.
// getTeamShield(name) uses fuzzy normalization so any reasonable spelling works.

// Competition shields
export const COMPETITION_SHIELDS: Record<string, string> = {
  liga: '/escudos/competiciones/liga-argentina.png',
  copa: '/escudos/competiciones/copa-argentina.png',
  internacional: '/escudos/competiciones/conmebol.png',
}

// ─── Master map: canonical key → PNG path ────────────────────────────────────
// Keys are already normalized (lowercase, no accents, no spaces).
// Multiple keys can point to the same file (aliases handled below).
const SHIELD_MAP: Record<string, string> = {
  // ── Argentina ──────────────────────────────────────────────────────────────
  lanus:                  '/escudos/argentina/lanus.png',
  aldosivi:               '/escudos/argentina/aldosivi.png',
  argentinos:             '/escudos/argentina/argentinos.png',
  argentinosjuniors:      '/escudos/argentina/argentinos.png',
  atleticotucuman:        '/escudos/argentina/atleticotucuman.png',
  atletictucuman:         '/escudos/argentina/atleticotucuman.png',
  banfield:               '/escudos/argentina/banfield.png',
  barracas:               '/escudos/argentina/barracas.png',
  barracascentral:        '/escudos/argentina/barracas.png',
  belgrano:               '/escudos/argentina/belgrano.png',
  boca:                   '/escudos/argentina/boca.png',
  bocajuniors:            '/escudos/argentina/boca.png',
  centralcordoba:         '/escudos/argentina/centralcordoba.png',
  centralcordobasde:      '/escudos/argentina/centralcordoba.png',
  defensa:                '/escudos/argentina/defensa.png',
  defensayjusticia:       '/escudos/argentina/defensa.png',
  estudiantes:            '/escudos/argentina/estudiantes.png',
  estudianteslaplata:     '/escudos/argentina/estudiantes.png',
  estudiantesrc:          '/escudos/argentina/estudiantesrc.png',
  gimnasia:               '/escudos/argentina/gimnasia.png',
  gimnasiaylp:            '/escudos/argentina/gimnasia.png',
  gimnasialaplata:        '/escudos/argentina/gimnasia.png',
  gimnasiamendoza:        '/escudos/argentina/gimnasiamendoza.png',
  huracan:                '/escudos/argentina/huracan.png',
  independiente:          '/escudos/argentina/independiente.png',
  independienterivadavia: '/escudos/argentina/independienteriv.png',
  independienteriv:       '/escudos/argentina/independienteriv.png',
  instituto:              '/escudos/argentina/instituto.png',
  newells:                '/escudos/argentina/newells.png',
  newellsoldboys:         '/escudos/argentina/newells.png',
  platense:               '/escudos/argentina/platense.png',
  racing:                 '/escudos/argentina/racing.png',
  racingclub:             '/escudos/argentina/racing.png',
  river:                  '/escudos/argentina/river.png',
  riverplate:             '/escudos/argentina/river.png',
  riestra:                '/escudos/argentina/riestra.png',
  rosariocentral:         '/escudos/argentina/rosariocentral.png',
  sanlorenzo:             '/escudos/argentina/sanlorenzo.png',
  sarmiento:              '/escudos/argentina/sarmiento.png',
  sarmientojunin:         '/escudos/argentina/sarmiento.png',
  talleres:               '/escudos/argentina/talleres.png',
  tallerescordoba:        '/escudos/argentina/talleres.png',
  tigre:                  '/escudos/argentina/tigre.png',
  union:                  '/escudos/argentina/union.png',
  unionsantafe:           '/escudos/argentina/union.png',
  velez:                  '/escudos/argentina/velez.png',
  velezSarsfield:         '/escudos/argentina/velez.png',
  velezsarsfield:         '/escudos/argentina/velez.png',

  // ── Brasil ─────────────────────────────────────────────────────────────────
  atleticomineiro:        '/escudos/brasil/atlmineiro.png',
  atleticomineiros:       '/escudos/brasil/atlmineiro.png',
  atlmineiro:             '/escudos/brasil/atlmineiro.png',
  atleticoparanaense:     '/escudos/brasil/atlparanaense.png',
  atleticopr:             '/escudos/brasil/atlparanaense.png',
  atlparanaense:          '/escudos/brasil/atlparanaense.png',
  athleticoparanaense:    '/escudos/brasil/atlparanaense.png',
  bahia:                  '/escudos/brasil/bahia.png',
  botafogo:               '/escudos/brasil/botafogo.png',
  chapecoense:            '/escudos/brasil/chapecoense.png',
  corinthians:            '/escudos/brasil/corinthians.png',
  coritiba:               '/escudos/brasil/coritiba.png',
  cruzeiro:               '/escudos/brasil/cruzeiro.png',
  flamengo:               '/escudos/brasil/flamengo.png',
  fluminense:             '/escudos/brasil/fluminense.png',
  gremio:                 '/escudos/brasil/gremio.png',
  internacional:          '/escudos/brasil/internacional.png',
  internacionalportoalegre: '/escudos/brasil/internacional.png',
  mirassol:               '/escudos/brasil/mirassol.png',
  palmeiras:              '/escudos/brasil/palmeiras.png',
  rbbragantino:           '/escudos/brasil/rbbragantino.png',
  bragantino:             '/escudos/brasil/rbbragantino.png',
  rbbragantine:           '/escudos/brasil/rbbragantino.png',
  remo:                   '/escudos/brasil/remo.png',
  santos:                 '/escudos/brasil/santos.png',
  saopaulo:               '/escudos/brasil/saopaulo.png',
  vasco:                  '/escudos/brasil/vasco.png',
  vascodagama:            '/escudos/brasil/vasco.png',
  vitoria:                '/escudos/brasil/vitoria.png',

  // ── Chile ──────────────────────────────────────────────────────────────────
  audax:                  '/escudos/chile/audax.png',
  audaxitaliano:          '/escudos/chile/audax.png',
  cobresal:               '/escudos/chile/cobresal.png',
  colocolo:               '/escudos/chile/colocolo.png',
  coquimbo:               '/escudos/chile/coquimbo.png',
  coquimbounido:          '/escudos/chile/coquimbo.png',
  deportesconcepcion:     '/escudos/chile/deportes_concepcion.png',
  deporteslimache:        '/escudos/chile/deportes_limache.png',
  deplaserena:            '/escudos/chile/deplaserena.png',
  deporteslaserena:       '/escudos/chile/deplaserena.png',
  everton:                '/escudos/chile/everton.png',
  evertonchile:           '/escudos/chile/everton.png',
  huachipato:             '/escudos/chile/huachipato.png',
  nublense:               '/escudos/chile/nublense.png',
  ohiggins:               '/escudos/chile/ohiggins.png',
  palestino:              '/escudos/chile/palestino.png',
  ucatolica:              '/escudos/chile/ucatolica.png',
  universidadcatolica:    '/escudos/chile/ucatolica.png',
  udechile:               '/escudos/chile/udechile.png',
  universidaddechile:     '/escudos/chile/udechile.png',
  udeconcepcion:          '/escudos/chile/udeconcepcion.png',
  unionlacalera:          '/escudos/chile/unionlacalera.png',

  // ── Colombia ───────────────────────────────────────────────────────────────
  aguilasdoradas:         '/escudos/colombia/aguilas_doradas.png',
  alianza:                '/escudos/colombia/alianza.png',
  alianzapetrolerabarrancabermeja: '/escudos/colombia/alianza_petrolera.png',
  alianzapetrolerabarrancaberm: '/escudos/colombia/alianza_petrolera.png',
  america:                '/escudos/colombia/america.png',
  americadecali:          '/escudos/colombia/america.png',
  atleticnacional:        '/escudos/colombia/atlnacional.png',
  atleticonacional:       '/escudos/colombia/atlnacional.png',
  boyacachico:            '/escudos/colombia/boyacachico.png',
  bucaramanga:            '/escudos/colombia/bucaramanga.png',
  atleticobucaramanga:    '/escudos/colombia/bucaramanga.png',
  cucuta:                 '/escudos/colombia/cucuta.png',
  cucutadeportivo:        '/escudos/colombia/cucuta.png',
  depcali:                '/escudos/colombia/depcali.png',
  deportivocali:          '/escudos/colombia/depcali.png',
  dim:                    '/escudos/colombia/dim.png',
  deportivoindependientedemedellin: '/escudos/colombia/dim.png',
  fortaleza:              '/escudos/colombia/fortaleza.png',
  internacionalbogota:    '/escudos/colombia/internacional_bogota.png',
  jaguares:               '/escudos/colombia/jaguares.png',
  junior:                 '/escudos/colombia/junior.png',
  juniorbarranquilla:     '/escudos/colombia/junior.png',
  llaneros:               '/escudos/colombia/llaneros.png',
  millonarios:            '/escudos/colombia/millonarios.png',
  oncecaldas:             '/escudos/colombia/oncecaldas.png',
  pasto:                  '/escudos/colombia/pasto.png',
  deportivopasto:         '/escudos/colombia/pasto.png',
  pereira:                '/escudos/colombia/pereira.png',
  deportivopereira:       '/escudos/colombia/pereira.png',
  santafe:                '/escudos/colombia/santafe.png',
  independientesantafe:   '/escudos/colombia/santafe.png',
  tolima:                 '/escudos/colombia/tolima.png',
  deportestolima:         '/escudos/colombia/tolima.png',

  // ── Ecuador ────────────────────────────────────────────────────────────────
  aucas:                  '/escudos/ecuador/aucas.png',
  societariaaucas:        '/escudos/ecuador/aucas.png',
  barcelonasc:            '/escudos/ecuador/barcelona.png',
  barcelona:              '/escudos/ecuador/barcelona.png',
  delfin:                 '/escudos/ecuador/delfin.png',
  depcuenca:              '/escudos/ecuador/depcuenca.png',
  deportivocuenca:        '/escudos/ecuador/depcuenca.png',
  emelec:                 '/escudos/ecuador/emelec.png',
  guayaquilcity:          '/escudos/ecuador/guayaquilcity.png',
  independientedelvalle:  '/escudos/ecuador/independientedv.png',
  independientedv:        '/escudos/ecuador/independientedv.png',
  ligadequito:            '/escudos/ecuador/ligadequito.png',
  ligadeportivaeuropeadequito: '/escudos/ecuador/ligadequito.png',
  macara:                 '/escudos/ecuador/macara.png',
  manta:                  '/escudos/ecuador/manta.png',
  mushucruna:             '/escudos/ecuador/mushucruna.png',
  orense:                 '/escudos/ecuador/orense.png',
  universidadcatolicaecuador: '/escudos/ecuador/universidadcatolica.png',

  // ── Paraguay ───────────────────────────────────────────────────────────────
  '2demayo':              '/escudos/paraguay/2demayo.png',
  atleticotembetary:      '/escudos/paraguay/atletico_tembetary.png',
  cerroporteno:           '/escudos/paraguay/cerroporteno.png',
  generalcaballero:       '/escudos/paraguay/general_caballero.png',
  guarani:                '/escudos/paraguay/guarani.png',
  guaranipy:              '/escudos/paraguay/guarani.png',
  libertadpy:             '/escudos/paraguay/libertad.png',
  nacional:               '/escudos/paraguay/nacional.png',
  olimpia:                '/escudos/paraguay/olimpia.png',
  olimpiapy:              '/escudos/paraguay/olimpia.png',
  recoletafc:             '/escudos/paraguay/recoleta_fc.png',
  sportivoameliano:       '/escudos/paraguay/sportivo_ameliano.png',
  sportivotrinidense:     '/escudos/paraguay/sportivo_trinidense.png',
  sportivoluqueno:        '/escudos/paraguay/sportivoluqueno.png',

  // ── Peru ───────────────────────────────────────────────────────────────────
  adt:                    '/escudos/peru/adt.png',
  alianzaatletico:        '/escudos/peru/alianza_atletico.png',
  alianzalima:            '/escudos/peru/alianzalima.png',
  atleticograu:           '/escudos/peru/atleticograu.png',
  cajamarca:              '/escudos/peru/cajamarca.png',
  cienciano:              '/escudos/peru/cienciano.png',
  comerciantesunidos:     '/escudos/peru/comerciantes_unidos.png',
  cusco:                  '/escudos/peru/cusco.png',
  cuscofbc:               '/escudos/peru/cusco.png',
  deportivogarcilaso:     '/escudos/peru/deportivo_garcilaso.png',
  huancayo:               '/escudos/peru/huancayo.png',
  deportsporthuancayo:    '/escudos/peru/huancayo.png',
  losChankas:             '/escudos/peru/los_chankas.png',
  loschankas:             '/escudos/peru/los_chankas.png',
  melgar:                 '/escudos/peru/melgar.png',
  moquegua:               '/escudos/peru/moquegua.png',
  sportboys:              '/escudos/peru/sportboys.png',
  sportingcristal:        '/escudos/peru/sportingcristal.png',
  universitario:          '/escudos/peru/universitario.png',
  universitariodeperu:    '/escudos/peru/universitario.png',
  utc:                    '/escudos/peru/utc.png',

  // ── Uruguay ────────────────────────────────────────────────────────────────
  albion:                 '/escudos/uruguay/albion.png',
  bostonriver:            '/escudos/uruguay/bostonriver.png',
  centralespanol:         '/escudos/uruguay/central_espanol.png',
  cerro:                  '/escudos/uruguay/cerro.png',
  cerrolargo:             '/escudos/uruguay/cerrolargo.png',
  danubio:                '/escudos/uruguay/danubio.png',
  defensoruy:             '/escudos/uruguay/defensor.png',
  defensorwatling:        '/escudos/uruguay/defensor.png',
  juventud:               '/escudos/uruguay/juventud.png',
  liverpooluy:            '/escudos/uruguay/liverpool.png',
  maldonado:              '/escudos/uruguay/maldonado.png',
  montevideocity:         '/escudos/uruguay/montevideocity.png',
  nationaluy:             '/escudos/uruguay/nacional.png',
  penarol:                '/escudos/uruguay/penarol.png',
  clubatleticopenarol:    '/escudos/uruguay/penarol.png',
  progreso:               '/escudos/uruguay/progreso.png',
  racinguy:               '/escudos/uruguay/racing.png',
  wanderers:              '/escudos/uruguay/wanderers.png',

  // ── Venezuela ──────────────────────────────────────────────────────────────
  academia:               '/escudos/venezuela/academia.png',
  anzoategui:             '/escudos/venezuela/anzoategui.png',
  carabobo:               '/escudos/venezuela/carabobo.png',
  caracas:                '/escudos/venezuela/caracas.png',
  deportivotachira:       '/escudos/venezuela/deportivotachira.png',
  estudiantesmerida:      '/escudos/venezuela/estudiantesmerida.png',
  laguaira:               '/escudos/venezuela/laguaira.png',
  metropolitanos:         '/escudos/venezuela/metropolitanos.png',
  minerosguayana:         '/escudos/venezuela/minerosguayana.png',
  monagas:                '/escudos/venezuela/monagas.png',
  portuguesa:             '/escudos/venezuela/portuguesa.png',
  rayozuliano:            '/escudos/venezuela/rayo_zuliano.png',
  trujillanos:            '/escudos/venezuela/trujillanos.png',
  univcentral:            '/escudos/venezuela/univcentral.png',
  universidadcentral:     '/escudos/venezuela/univcentral.png',
  zamora:                 '/escudos/venezuela/zamora.png',

  // ── Bolivia ────────────────────────────────────────────────────────────────
  abb:                    '/escudos/bolivia/abb.png',
  alwaysready:            '/escudos/bolivia/always_ready.png',
  aurora:                 '/escudos/bolivia/aurora.png',
  blooming:               '/escudos/bolivia/blooming.png',
  bolivar:                '/escudos/bolivia/bolivar.png',
  guabira:                '/escudos/bolivia/guabira.png',
  gualbertoDSJ:           '/escudos/bolivia/gualberto_villarroel_dsj.png',
  independientepetr:      '/escudos/bolivia/independiente_petrolero.png',
  jorgewilstermann:       '/escudos/bolivia/jorge_wilstermann.png',
  nacionalpotosi:         '/escudos/bolivia/nacional_potosi.png',
  orientepetr:            '/escudos/bolivia/oriente_petrolero.png',
  orienpetrole:           '/escudos/bolivia/oriente_petrolero.png',
  realoruro:              '/escudos/bolivia/real_oruro.png',
  realtomayapo:           '/escudos/bolivia/real_tomayapo.png',
  realpotosi:             '/escudos/bolivia/realpotosi.png',
  sanantoniobd:           '/escudos/bolivia/san_antonio.png',
  thestrongest:           '/escudos/bolivia/the_strongest.png',
  universitariodevintobol: '/escudos/bolivia/universitario_de_vinto.png',
}

// ─── Normalize helper ─────────────────────────────────────────────────────────
// Strips accents, lowercases, removes spaces and common noise words.
function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, '')       // remove non-alphanumeric
}

// Noise words to strip for partial matching
const NOISE = ['club', 'atletico', 'atletica', 'deportivo', 'deportes', 'fc', 'sc', 'cf', 'sd', 'cd', 'ca', 'de', 'del', 'la', 'el', 'los', 'las']

function stripNoise(norm: string): string {
  let s = norm
  for (const n of NOISE) s = s.replace(new RegExp(`^${n}|${n}$`, 'g'), '')
  return s
}

// ─── Main resolver ────────────────────────────────────────────────────────────
export function getTeamShield(teamName: string): string | null {
  if (!teamName) return null

  const norm = normalize(teamName)

  // 1. Exact match
  if (SHIELD_MAP[norm]) return SHIELD_MAP[norm]

  // 2. Try without noise words
  const stripped = stripNoise(norm)
  if (stripped && SHIELD_MAP[stripped]) return SHIELD_MAP[stripped]

  // 3. Partial: check if any key is contained in the name or vice versa
  for (const key of Object.keys(SHIELD_MAP)) {
    if (norm.includes(key) || key.includes(norm)) return SHIELD_MAP[key]
  }

  // 4. Stripped partial
  for (const key of Object.keys(SHIELD_MAP)) {
    const ks = stripNoise(key)
    if (ks.length >= 4 && (stripped.includes(ks) || ks.includes(stripped))) {
      return SHIELD_MAP[key]
    }
  }

  return null
}

export function getCompetitionShield(competition: string): string | null {
  return COMPETITION_SHIELDS[competition] ?? null
}
