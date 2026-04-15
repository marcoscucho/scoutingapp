export type Competition = 'liga' | 'copa' | 'internacional'
export type Result = 'W' | 'D' | 'L'

export interface MatchData {
  id: number
  date: string
  rival: string
  isHome: boolean
  competition: Competition
  result: Result
  golesAFavor: number
  golesEnContra: number
  duration: number
  formation: string
  xG: number
  tiros: number
  tirosPorteria: number
  tirosPorteria_pct: number
  posesion: number
  pases: number
  pasesLogrados: number
  pases_pct: number
  duelos: number
  duelosGanados: number
  duelos_pct: number
  ataquesPositionales: number
  ataquesPositionalesRemate: number
  contraataques: number
  contraataquesRemate: number
  balonParado: number
  balonParadoRemate: number
  corners: number
  centros: number
  centrosPrecisos: number
  pasesEnProfundidad: number
  golesRecibidos: number
  tirosContra: number
  tirosContraPorteria: number
  duelosDefensivos: number
  duelosDefensivosGanados: number
  duelosDefensivos_pct: number
  duelosAereos: number
  duelosAereosGanados: number
  duelosAereos_pct: number
  interceptaciones: number
  despejes: number
  faltas: number
  amarillas: number
  rojas: number
  pasesUltimoTercio: number
  pasesUltimoTercioLogrados: number
  pasesUltimoTercio_pct: number
  pasesProgresivos: number
  pasesProgresivosLogrados: number
  pasesProgresivos_pct: number
  ppda: number
  intensidadPaso: number
  // Goleadores y asistidores del partido (completar para ranking correcto)
  scorers?: string[]     // ej: ['Briasco', 'Valois', 'Briasco']  (repetir si marcó 2)
  assisters?: string[]   // ej: ['Marcelino', 'Esquivel']
  posesion_rival?: number  // posesión del rival en %, si se necesita independiente del cálculo
  amarillas_rival?: number
  faltas_rival?: number
  corners_rival?: number
}

export const LANUS_2026: MatchData[] = [
  {
    id: 1, date: '2026-01-19', rival: 'Sarmiento de La Banda', isHome: true, competition: 'copa',
    result: 'W', golesAFavor: 4, golesEnContra: 1, duration: 92, formation: '4-2-3-1',
    xG: 2.67, tiros: 15, tirosPorteria: 6, tirosPorteria_pct: 40.0,
    posesion: 68.96, pases: 571, pasesLogrados: 501, pases_pct: 87.74,
    duelos: 190, duelosGanados: 99, duelos_pct: 52.11,
    ataquesPositionales: 37, ataquesPositionalesRemate: 6, contraataques: 1, contraataquesRemate: 0,
    balonParado: 27, balonParadoRemate: 7, corners: 7, centros: 23, centrosPrecisos: 9, pasesEnProfundidad: 14,
    golesRecibidos: 1, tirosContra: 8, tirosContraPorteria: 2,
    duelosDefensivos: 60, duelosDefensivosGanados: 41, duelosDefensivos_pct: 68.33,
    duelosAereos: 29, duelosAereosGanados: 16, duelosAereos_pct: 55.17,
    interceptaciones: 37, despejes: 15, faltas: 15, amarillas: 3, rojas: 0,
    pasesUltimoTercio: 72, pasesUltimoTercioLogrados: 62, pasesUltimoTercio_pct: 86.11,
    pasesProgresivos: 108, pasesProgresivosLogrados: 91, pasesProgresivos_pct: 84.26,
    ppda: 5.03, intensidadPaso: 17.86,
  },
  {
    id: 2, date: '2026-01-23', rival: 'San Lorenzo', isHome: false, competition: 'liga',
    result: 'W', golesAFavor: 3, golesEnContra: 2, duration: 99, formation: '4-4-2',
    xG: 1.66, tiros: 10, tirosPorteria: 5, tirosPorteria_pct: 50.0,
    posesion: 37.97, pases: 281, pasesLogrados: 215, pases_pct: 76.51,
    duelos: 238, duelosGanados: 111, duelos_pct: 46.64,
    ataquesPositionales: 21, ataquesPositionalesRemate: 1, contraataques: 2, contraataquesRemate: 2,
    balonParado: 34, balonParadoRemate: 7, corners: 8, centros: 7, centrosPrecisos: 1, pasesEnProfundidad: 4,
    golesRecibidos: 2, tirosContra: 16, tirosContraPorteria: 5,
    duelosDefensivos: 84, duelosDefensivosGanados: 47, duelosDefensivos_pct: 55.95,
    duelosAereos: 50, duelosAereosGanados: 20, duelosAereos_pct: 40.0,
    interceptaciones: 62, despejes: 35, faltas: 20, amarillas: 4, rojas: 0,
    pasesUltimoTercio: 34, pasesUltimoTercioLogrados: 22, pasesUltimoTercio_pct: 64.71,
    pasesProgresivos: 59, pasesProgresivosLogrados: 34, pasesProgresivos_pct: 57.63,
    ppda: 7.72, intensidadPaso: 16.82,
  },
  {
    id: 3, date: '2026-01-29', rival: 'Unión Santa Fe', isHome: true, competition: 'liga',
    result: 'W', golesAFavor: 2, golesEnContra: 1, duration: 100, formation: '4-3-3',
    xG: 2.02, tiros: 16, tirosPorteria: 6, tirosPorteria_pct: 37.5,
    posesion: 59.54, pases: 523, pasesLogrados: 449, pases_pct: 85.85,
    duelos: 220, duelosGanados: 99, duelos_pct: 45.0,
    ataquesPositionales: 29, ataquesPositionalesRemate: 10, contraataques: 3, contraataquesRemate: 3,
    balonParado: 19, balonParadoRemate: 3, corners: 5, centros: 11, centrosPrecisos: 3, pasesEnProfundidad: 8,
    golesRecibidos: 1, tirosContra: 15, tirosContraPorteria: 6,
    duelosDefensivos: 73, duelosDefensivosGanados: 46, duelosDefensivos_pct: 63.01,
    duelosAereos: 42, duelosAereosGanados: 19, duelosAereos_pct: 45.24,
    interceptaciones: 52, despejes: 19, faltas: 7, amarillas: 3, rojas: 0,
    pasesUltimoTercio: 49, pasesUltimoTercioLogrados: 37, pasesUltimoTercio_pct: 75.51,
    pasesProgresivos: 76, pasesProgresivosLogrados: 55, pasesProgresivos_pct: 72.37,
    ppda: 6.2, intensidadPaso: 16.78,
  },
  {
    id: 4, date: '2026-02-04', rival: 'Instituto', isHome: false, competition: 'liga',
    result: 'D', golesAFavor: 2, golesEnContra: 2, duration: 102, formation: '4-2-3-1',
    xG: 0.91, tiros: 11, tirosPorteria: 7, tirosPorteria_pct: 63.64,
    posesion: 51.54, pases: 384, pasesLogrados: 311, pases_pct: 80.99,
    duelos: 179, duelosGanados: 82, duelos_pct: 45.81,
    ataquesPositionales: 22, ataquesPositionalesRemate: 8, contraataques: 2, contraataquesRemate: 1,
    balonParado: 22, balonParadoRemate: 1, corners: 3, centros: 8, centrosPrecisos: 0, pasesEnProfundidad: 6,
    golesRecibidos: 2, tirosContra: 11, tirosContraPorteria: 4,
    duelosDefensivos: 57, duelosDefensivosGanados: 37, duelosDefensivos_pct: 64.91,
    duelosAereos: 36, duelosAereosGanados: 18, duelosAereos_pct: 50.0,
    interceptaciones: 35, despejes: 21, faltas: 15, amarillas: 3, rojas: 0,
    pasesUltimoTercio: 54, pasesUltimoTercioLogrados: 37, pasesUltimoTercio_pct: 68.52,
    pasesProgresivos: 63, pasesProgresivosLogrados: 45, pasesProgresivos_pct: 71.43,
    ppda: 8.24, intensidadPaso: 17.25,
  },
  {
    id: 5, date: '2026-02-09', rival: 'Talleres Córdoba', isHome: true, competition: 'liga',
    result: 'D', golesAFavor: 1, golesEnContra: 1, duration: 96, formation: '4-2-3-1',
    xG: 1.01, tiros: 8, tirosPorteria: 4, tirosPorteria_pct: 50.0,
    posesion: 44.28, pases: 481, pasesLogrados: 392, pases_pct: 81.5,
    duelos: 224, duelosGanados: 126, duelos_pct: 56.25,
    ataquesPositionales: 30, ataquesPositionalesRemate: 7, contraataques: 1, contraataquesRemate: 0,
    balonParado: 17, balonParadoRemate: 1, corners: 0, centros: 16, centrosPrecisos: 5, pasesEnProfundidad: 6,
    golesRecibidos: 1, tirosContra: 12, tirosContraPorteria: 5,
    duelosDefensivos: 81, duelosDefensivosGanados: 63, duelosDefensivos_pct: 77.78,
    duelosAereos: 44, duelosAereosGanados: 24, duelosAereos_pct: 54.55,
    interceptaciones: 35, despejes: 13, faltas: 12, amarillas: 1, rojas: 0,
    pasesUltimoTercio: 61, pasesUltimoTercioLogrados: 45, pasesUltimoTercio_pct: 73.77,
    pasesProgresivos: 91, pasesProgresivosLogrados: 65, pasesProgresivos_pct: 71.43,
    ppda: 14.12, intensidadPaso: 16.78,
  },
  {
    id: 6, date: '2026-02-14', rival: 'Independiente', isHome: false, competition: 'liga',
    result: 'L', golesAFavor: 0, golesEnContra: 2, duration: 102, formation: '4-2-3-1',
    xG: 0.05, tiros: 5, tirosPorteria: 0, tirosPorteria_pct: 0.0,
    posesion: 50.94, pases: 366, pasesLogrados: 292, pases_pct: 79.78,
    duelos: 196, duelosGanados: 103, duelos_pct: 52.55,
    ataquesPositionales: 16, ataquesPositionalesRemate: 0, contraataques: 0, contraataquesRemate: 0,
    balonParado: 27, balonParadoRemate: 3, corners: 1, centros: 12, centrosPrecisos: 6, pasesEnProfundidad: 2,
    golesRecibidos: 2, tirosContra: 16, tirosContraPorteria: 3,
    duelosDefensivos: 61, duelosDefensivosGanados: 41, duelosDefensivos_pct: 67.21,
    duelosAereos: 51, duelosAereosGanados: 30, duelosAereos_pct: 58.82,
    interceptaciones: 46, despejes: 13, faltas: 13, amarillas: 2, rojas: 0,
    pasesUltimoTercio: 41, pasesUltimoTercioLogrados: 25, pasesUltimoTercio_pct: 60.98,
    pasesProgresivos: 68, pasesProgresivosLogrados: 41, pasesProgresivos_pct: 60.29,
    ppda: 9.96, intensidadPaso: 15.58,
  },
  {
    id: 7, date: '2026-02-20', rival: 'Flamengo', isHome: true, competition: 'internacional',
    result: 'W', golesAFavor: 1, golesEnContra: 0, duration: 98, formation: '4-2-3-1',
    xG: 1.05, tiros: 14, tirosPorteria: 5, tirosPorteria_pct: 35.71,
    posesion: 38.72, pases: 293, pasesLogrados: 237, pases_pct: 80.89,
    duelos: 208, duelosGanados: 96, duelos_pct: 46.15,
    ataquesPositionales: 23, ataquesPositionalesRemate: 7, contraataques: 0, contraataquesRemate: 0,
    balonParado: 30, balonParadoRemate: 6, corners: 12, centros: 14, centrosPrecisos: 6, pasesEnProfundidad: 4,
    golesRecibidos: 0, tirosContra: 8, tirosContraPorteria: 1,
    duelosDefensivos: 65, duelosDefensivosGanados: 38, duelosDefensivos_pct: 58.46,
    duelosAereos: 39, duelosAereosGanados: 18, duelosAereos_pct: 46.15,
    interceptaciones: 31, despejes: 13, faltas: 15, amarillas: 1, rojas: 0,
    pasesUltimoTercio: 40, pasesUltimoTercioLogrados: 29, pasesUltimoTercio_pct: 72.5,
    pasesProgresivos: 65, pasesProgresivosLogrados: 53, pasesProgresivos_pct: 81.54,
    ppda: 13.83, intensidadPaso: 13.9,
  },
  {
    id: 8, date: '2026-02-27', rival: 'Flamengo', isHome: false, competition: 'internacional',
    result: 'W', golesAFavor: 3, golesEnContra: 2, duration: 133, formation: '4-4-2',
    xG: 0.98, tiros: 8, tirosPorteria: 4, tirosPorteria_pct: 50.0,
    posesion: 24.87, pases: 237, pasesLogrados: 154, pases_pct: 64.98,
    duelos: 243, duelosGanados: 107, duelos_pct: 44.03,
    ataquesPositionales: 16, ataquesPositionalesRemate: 2, contraataques: 2, contraataquesRemate: 2,
    balonParado: 30, balonParadoRemate: 4, corners: 3, centros: 6, centrosPrecisos: 0, pasesEnProfundidad: 0,
    golesRecibidos: 2, tirosContra: 15, tirosContraPorteria: 6,
    duelosDefensivos: 89, duelosDefensivosGanados: 50, duelosDefensivos_pct: 56.18,
    duelosAereos: 52, duelosAereosGanados: 22, duelosAereos_pct: 42.31,
    interceptaciones: 53, despejes: 23, faltas: 23, amarillas: 2, rojas: 0,
    pasesUltimoTercio: 43, pasesUltimoTercioLogrados: 17, pasesUltimoTercio_pct: 39.53,
    pasesProgresivos: 67, pasesProgresivosLogrados: 32, pasesProgresivos_pct: 47.76,
    ppda: 14.4, intensidadPaso: 14.77,
  },
  {
    id: 9, date: '2026-03-02', rival: 'Defensa y Justicia', isHome: false, competition: 'liga',
    result: 'D', golesAFavor: 1, golesEnContra: 1, duration: 97, formation: '4-4-2',
    xG: 0.76, tiros: 10, tirosPorteria: 3, tirosPorteria_pct: 30.0,
    posesion: 53.32, pases: 532, pasesLogrados: 454, pases_pct: 85.34,
    duelos: 176, duelosGanados: 71, duelos_pct: 40.34,
    ataquesPositionales: 15, ataquesPositionalesRemate: 5, contraataques: 2, contraataquesRemate: 1,
    balonParado: 21, balonParadoRemate: 4, corners: 5, centros: 13, centrosPrecisos: 1, pasesEnProfundidad: 3,
    golesRecibidos: 1, tirosContra: 12, tirosContraPorteria: 5,
    duelosDefensivos: 61, duelosDefensivosGanados: 32, duelosDefensivos_pct: 52.46,
    duelosAereos: 30, duelosAereosGanados: 12, duelosAereos_pct: 40.0,
    interceptaciones: 36, despejes: 5, faltas: 10, amarillas: 2, rojas: 0,
    pasesUltimoTercio: 53, pasesUltimoTercioLogrados: 30, pasesUltimoTercio_pct: 56.6,
    pasesProgresivos: 66, pasesProgresivosLogrados: 45, pasesProgresivos_pct: 68.18,
    ppda: 10.0, intensidadPaso: 17.86,
  },
  {
    id: 10, date: '2026-03-05', rival: 'Boca Juniors', isHome: true, competition: 'liga',
    result: 'L', golesAFavor: 0, golesEnContra: 3, duration: 95, formation: '4-2-3-1',
    xG: 0.41, tiros: 9, tirosPorteria: 2, tirosPorteria_pct: 22.22,
    posesion: 46.36, pases: 465, pasesLogrados: 392, pases_pct: 84.3,
    duelos: 190, duelosGanados: 85, duelos_pct: 44.74,
    ataquesPositionales: 36, ataquesPositionalesRemate: 4, contraataques: 0, contraataquesRemate: 0,
    balonParado: 21, balonParadoRemate: 5, corners: 8, centros: 12, centrosPrecisos: 3, pasesEnProfundidad: 7,
    golesRecibidos: 3, tirosContra: 10, tirosContraPorteria: 5,
    duelosDefensivos: 43, duelosDefensivosGanados: 25, duelosDefensivos_pct: 58.14,
    duelosAereos: 43, duelosAereosGanados: 25, duelosAereos_pct: 58.14,
    interceptaciones: 29, despejes: 8, faltas: 9, amarillas: 3, rojas: 0,
    pasesUltimoTercio: 63, pasesUltimoTercioLogrados: 46, pasesUltimoTercio_pct: 73.02,
    pasesProgresivos: 79, pasesProgresivosLogrados: 61, pasesProgresivos_pct: 77.22,
    ppda: 14.5, intensidadPaso: 18.0,
  },
  {
    id: 11, date: '2026-03-14', rival: 'Estudiantes', isHome: false, competition: 'liga',
    result: 'W', golesAFavor: 1, golesEnContra: 0, duration: 96, formation: '4-4-2',
    xG: 1.11, tiros: 7, tirosPorteria: 2, tirosPorteria_pct: 28.57,
    posesion: 40.53, pases: 383, pasesLogrados: 320, pases_pct: 83.55,
    duelos: 209, duelosGanados: 93, duelos_pct: 44.5,
    ataquesPositionales: 20, ataquesPositionalesRemate: 5, contraataques: 1, contraataquesRemate: 1,
    balonParado: 20, balonParadoRemate: 1, corners: 5, centros: 11, centrosPrecisos: 3, pasesEnProfundidad: 6,
    golesRecibidos: 0, tirosContra: 15, tirosContraPorteria: 3,
    duelosDefensivos: 58, duelosDefensivosGanados: 30, duelosDefensivos_pct: 51.72,
    duelosAereos: 55, duelosAereosGanados: 26, duelosAereos_pct: 47.27,
    interceptaciones: 46, despejes: 20, faltas: 13, amarillas: 2, rojas: 0,
    pasesUltimoTercio: 41, pasesUltimoTercioLogrados: 28, pasesUltimoTercio_pct: 68.29,
    pasesProgresivos: 61, pasesProgresivosLogrados: 40, pasesProgresivos_pct: 65.57,
    ppda: 12.1, intensidadPaso: 17.63,
  },
  {
    id: 12, date: '2026-03-17', rival: "Newell's Old Boys", isHome: true, competition: 'liga',
    result: 'W', golesAFavor: 5, golesEnContra: 0, duration: 91, formation: '4-4-2',
    xG: 2.35, tiros: 11, tirosPorteria: 6, tirosPorteria_pct: 54.55,
    posesion: 62.95, pases: 568, pasesLogrados: 510, pases_pct: 89.79,
    duelos: 158, duelosGanados: 66, duelos_pct: 41.77,
    ataquesPositionales: 29, ataquesPositionalesRemate: 8, contraataques: 0, contraataquesRemate: 0,
    balonParado: 18, balonParadoRemate: 2, corners: 7, centros: 14, centrosPrecisos: 5, pasesEnProfundidad: 9,
    golesRecibidos: 0, tirosContra: 4, tirosContraPorteria: 2,
    duelosDefensivos: 51, duelosDefensivosGanados: 32, duelosDefensivos_pct: 62.75,
    duelosAereos: 24, duelosAereosGanados: 12, duelosAereos_pct: 50.0,
    interceptaciones: 22, despejes: 5, faltas: 13, amarillas: 2, rojas: 0,
    pasesUltimoTercio: 64, pasesUltimoTercioLogrados: 52, pasesUltimoTercio_pct: 81.25,
    pasesProgresivos: 84, pasesProgresivosLogrados: 69, pasesProgresivos_pct: 82.14,
    ppda: 12.17, intensidadPaso: 17.26,
  },
  {
    id: 13, date: '2026-03-21', rival: 'Vélez Sarsfield', isHome: false, competition: 'liga',
    result: 'L', golesAFavor: 0, golesEnContra: 1, duration: 96, formation: '4-4-2',
    xG: 1.88, tiros: 17, tirosPorteria: 7, tirosPorteria_pct: 41.18,
    posesion: 46.1, pases: 337, pasesLogrados: 264, pases_pct: 78.34,
    duelos: 224, duelosGanados: 109, duelos_pct: 48.66,
    ataquesPositionales: 31, ataquesPositionalesRemate: 12, contraataques: 2, contraataquesRemate: 1,
    balonParado: 21, balonParadoRemate: 3, corners: 2, centros: 18, centrosPrecisos: 7, pasesEnProfundidad: 2,
    golesRecibidos: 1, tirosContra: 10, tirosContraPorteria: 5,
    duelosDefensivos: 71, duelosDefensivosGanados: 39, duelosDefensivos_pct: 54.93,
    duelosAereos: 57, duelosAereosGanados: 27, duelosAereos_pct: 47.37,
    interceptaciones: 50, despejes: 30, faltas: 19, amarillas: 3, rojas: 0,
    pasesUltimoTercio: 53, pasesUltimoTercioLogrados: 37, pasesUltimoTercio_pct: 69.81,
    pasesProgresivos: 67, pasesProgresivosLogrados: 50, pasesProgresivos_pct: 74.63,
    ppda: 10.07, intensidadPaso: 15.11,
  },
  {
    id: 14, date: '2026-03-26', rival: 'Argentinos Juniors', isHome: false, competition: 'liga',
    result: 'L', golesAFavor: 1, golesEnContra: 2, duration: 97, formation: '4-2-3-1',
    xG: 0.72, tiros: 9, tirosPorteria: 3, tirosPorteria_pct: 33.33,
    posesion: 43.8, pases: 352, pasesLogrados: 278, pases_pct: 78.98,
    duelos: 213, duelosGanados: 98, duelos_pct: 46.01,
    ataquesPositionales: 18, ataquesPositionalesRemate: 4, contraataques: 1, contraataquesRemate: 0,
    balonParado: 24, balonParadoRemate: 3, corners: 3, centros: 10, centrosPrecisos: 3, pasesEnProfundidad: 3,
    golesRecibidos: 2, tirosContra: 14, tirosContraPorteria: 5,
    duelosDefensivos: 68, duelosDefensivosGanados: 40, duelosDefensivos_pct: 58.82,
    duelosAereos: 46, duelosAereosGanados: 21, duelosAereos_pct: 45.65,
    interceptaciones: 44, despejes: 22, faltas: 16, amarillas: 3, rojas: 0,
    pasesUltimoTercio: 38, pasesUltimoTercioLogrados: 24, pasesUltimoTercio_pct: 63.16,
    pasesProgresivos: 62, pasesProgresivosLogrados: 42, pasesProgresivos_pct: 67.74,
    ppda: 9.14, intensidadPaso: 15.88,
  },
  {
    id: 15, date: '2026-04-01', rival: 'Platense', isHome: true, competition: 'liga',
    result: 'D', golesAFavor: 0, golesEnContra: 0, duration: 97, formation: '4-2-3-1',
    xG: 0.61, tiros: 8, tirosPorteria: 3, tirosPorteria_pct: 37.5,
    posesion: 52.4, pases: 487, pasesLogrados: 410, pases_pct: 84.19,
    duelos: 194, duelosGanados: 91, duelos_pct: 46.91,
    ataquesPositionales: 21, ataquesPositionalesRemate: 5, contraataques: 0, contraataquesRemate: 0,
    balonParado: 19, balonParadoRemate: 2, corners: 4, centros: 9, centrosPrecisos: 2, pasesEnProfundidad: 4,
    golesRecibidos: 0, tirosContra: 9, tirosContraPorteria: 3,
    duelosDefensivos: 63, duelosDefensivosGanados: 39, duelosDefensivos_pct: 61.9,
    duelosAereos: 38, duelosAereosGanados: 19, duelosAereos_pct: 50.0,
    interceptaciones: 41, despejes: 18, faltas: 11, amarillas: 2, rojas: 0,
    pasesUltimoTercio: 47, pasesUltimoTercioLogrados: 32, pasesUltimoTercio_pct: 68.09,
    pasesProgresivos: 71, pasesProgresivosLogrados: 55, pasesProgresivos_pct: 77.46,
    ppda: 11.2, intensidadPaso: 16.42,
  },
  {
    id: 16, date: '2026-04-09', rival: 'Mirassol', isHome: false, competition: 'internacional',
    result: 'L', golesAFavor: 0, golesEnContra: 1, duration: 101, formation: '4-2-3-1',
    xG: 0.3, tiros: 6, tirosPorteria: 2, tirosPorteria_pct: 33.33,
    posesion: 49.6, pases: 394, pasesLogrados: 318, pases_pct: 80.71,
    duelos: 207, duelosGanados: 92, duelos_pct: 44.44,
    ataquesPositionales: 21, ataquesPositionalesRemate: 1, contraataques: 0, contraataquesRemate: 0,
    balonParado: 35, balonParadoRemate: 4, corners: 8, centros: 17, centrosPrecisos: 4, pasesEnProfundidad: 2,
    golesRecibidos: 1, tirosContra: 10, tirosContraPorteria: 3,
    duelosDefensivos: 74, duelosDefensivosGanados: 48, duelosDefensivos_pct: 64.86,
    duelosAereos: 52, duelosAereosGanados: 18, duelosAereos_pct: 34.62,
    interceptaciones: 22, despejes: 10, faltas: 7, amarillas: 1, rojas: 1,
    pasesUltimoTercio: 47, pasesUltimoTercioLogrados: 34, pasesUltimoTercio_pct: 72.34,
    pasesProgresivos: 69, pasesProgresivosLogrados: 44, pasesProgresivos_pct: 63.77,
    ppda: 11.33, intensidadPaso: 17.8,
  },
  {
    id: 17, date: '2026-04-14', rival: 'Banfield', isHome: true, competition: 'liga',
    result: 'W', golesAFavor: 1, golesEnContra: 0, duration: 100, formation: '4-2-3-1',
    xG: 1.66, tiros: 16, tirosPorteria: 3, tirosPorteria_pct: 18.75,
    posesion: 63.12, pases: 545, pasesLogrados: 478, pases_pct: 87.71,
    duelos: 204, duelosGanados: 98, duelos_pct: 48.04,
    ataquesPositionales: 34, ataquesPositionalesRemate: 11, contraataques: 1, contraataquesRemate: 1,
    balonParado: 23, balonParadoRemate: 3, corners: 5, centros: 20, centrosPrecisos: 9, pasesEnProfundidad: 9,
    golesRecibidos: 0, tirosContra: 11, tirosContraPorteria: 3,
    duelosDefensivos: 76, duelosDefensivosGanados: 47, duelosDefensivos_pct: 61.84,
    duelosAereos: 35, duelosAereosGanados: 17, duelosAereos_pct: 48.57,
    interceptaciones: 32, despejes: 17, faltas: 19, amarillas: 4, rojas: 0,
    pasesUltimoTercio: 68, pasesUltimoTercioLogrados: 54, pasesUltimoTercio_pct: 79.41,
    pasesProgresivos: 72, pasesProgresivosLogrados: 58, pasesProgresivos_pct: 80.56,
    ppda: 5.88, intensidadPaso: 17.47,
    scorers: ['Valois'],
  },
]

export const DIVISIONS = [
  { id: 'primera', label: 'Primera', hasData: true },
  { id: 'reserva', label: 'Reserva', hasData: false },
  { id: '4ta', label: '4ta', hasData: false },
  { id: '5ta', label: '5ta', hasData: false },
  { id: '6ta', label: '6ta', hasData: false },
  { id: '7ma', label: '7ma', hasData: false },
  { id: '8va', label: '8va', hasData: false },
  { id: '9na', label: '9na', hasData: false },
  { id: 'pre9na', label: 'Pre-9na', hasData: false },
]

export function avg(matches: MatchData[], key: keyof MatchData): number {
  if (!matches.length) return 0
  const sum = matches.reduce((acc, m) => acc + (m[key] as number), 0)
  return sum / matches.length
}
