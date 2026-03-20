// ─── TRANSFERMARKT DATA — PLANTEL LANÚS ───────────────────────────────────────
// Scraped from Transfermarkt. Keyed by the Jugador abbreviation used in the sheet.
// Fields: nombre_completo, imagen, representante, valor_mercado (€), fin_contrato

export interface TMPlayerData {
  nombre_completo: string
  imagen: string
  representante: string | null
  valor_mercado: number      // raw euros
  valor_mercado_fmt: string  // formatted string
  fin_contrato: string       // DD/MM/YYYY
}

const TM_DATA: Record<string, TMPlayerData> = {
  'F. Peña Biafore': {
    nombre_completo: 'Felipe Peña Biafore',
    imagen: 'https://img.a.transfermarkt.technology/portrait/big/894194-1644878091.png',
    representante: 'Score Futbol',
    valor_mercado: 1_700_000,
    valor_mercado_fmt: '€1,70M',
    fin_contrato: '31/12/2028',
  },
  'W. Bou': {
    nombre_completo: 'Walter Ariel Bou',
    imagen: 'https://img.a.transfermarkt.technology/portrait/big/334233-1721936038.png',
    representante: 'Score Futbol',
    valor_mercado: 1_000_000,
    valor_mercado_fmt: '€1,00M',
    fin_contrato: '31/12/2027',
  },
  'E. Salvio': {
    nombre_completo: 'Eduardo Antonio Salvio',
    imagen: 'https://img.a.transfermarkt.technology/portrait/big/84535-1721935987.png',
    representante: 'Familiar',
    valor_mercado: 900_000,
    valor_mercado_fmt: '€900K',
    fin_contrato: '31/12/2026',
  },
  'A. Cardozo': {
    nombre_completo: 'Agustín Ezequiel Cardozo',
    imagen: 'https://img.a.transfermarkt.technology/portrait/big/469762-1727449491.jpg',
    representante: 'PRI Sports',
    valor_mercado: 2_500_000,
    valor_mercado_fmt: '€2,50M',
    fin_contrato: '31/12/2027',
  },
  'R. Carrera': {
    nombre_completo: 'Ramiro Ángel Carrera',
    imagen: 'https://img.a.transfermarkt.technology/portrait/big/282283-1721935700.png',
    representante: 'CN Sports Argentina',
    valor_mercado: 1_000_000,
    valor_mercado_fmt: '€1,00M',
    fin_contrato: '31/12/2026',
  },
  'M. Sepúlveda': {
    nombre_completo: 'Matías Ignacio Sepúlveda Méndez',
    imagen: 'https://img.a.transfermarkt.technology/portrait/big/511436-1674745716.jpg',
    representante: 'Vibra Futbol',
    valor_mercado: 1_200_000,
    valor_mercado_fmt: '€1,20M',
    fin_contrato: '31/12/2029',
  },
  'C. Izquierdoz': {
    nombre_completo: 'Carlos Roberto Izquierdoz',
    imagen: 'https://img.a.transfermarkt.technology/portrait/big/116968-1721933804.png',
    representante: null,
    valor_mercado: 450_000,
    valor_mercado_fmt: '€450K',
    fin_contrato: '30/06/2026',
  },
  'T. Guidara': {
    nombre_completo: 'Tomás Ezequiel Guidara',
    imagen: 'https://img.a.transfermarkt.technology/portrait/big/355900-1755535002.jpg',
    representante: 'Capital Group SM',
    valor_mercado: 1_200_000,
    valor_mercado_fmt: '€1,20M',
    fin_contrato: '31/12/2028',
  },
  'S. Marcich': {
    nombre_completo: 'Sasha Julián Marcich',
    imagen: 'https://img.a.transfermarkt.technology/portrait/big/867621-1724877200.jpg',
    representante: 'PRI Sports',
    valor_mercado: 3_000_000,
    valor_mercado_fmt: '€3,00M',
    fin_contrato: '31/12/2028',
  },
  'F. Watson': {
    nombre_completo: 'Franco Nahuel Watson',
    imagen: 'https://img.a.transfermarkt.technology/portrait/big/654733-1677162423.JPG',
    representante: 'Gol Sudamérica',
    valor_mercado: 600_000,
    valor_mercado_fmt: '€600K',
    fin_contrato: '31/12/2027',
  },
  'N. Morgantini': {
    nombre_completo: 'Nicolás Jorge Morgantini',
    imagen: 'https://img.a.transfermarkt.technology/portrait/big/615253-1721935501.png',
    representante: null,
    valor_mercado: 300_000,
    valor_mercado_fmt: '€300K',
    fin_contrato: '31/12/2027',
  },
  'G. Pérez': {
    nombre_completo: 'Gonzalo Germán Pérez Corbalán',
    imagen: 'https://img.a.transfermarkt.technology/portrait/big/799594-1721933872.png',
    representante: 'UruFutbol',
    valor_mercado: 1_300_000,
    valor_mercado_fmt: '€1,30M',
    fin_contrato: '31/12/2028',
  },
  'J. Canale': {
    nombre_completo: 'José María Canale Domínguez',
    imagen: 'https://img.a.transfermarkt.technology/portrait/big/402627-1721933937.png',
    representante: 'Players Advisers',
    valor_mercado: 1_800_000,
    valor_mercado_fmt: '€1,80M',
    fin_contrato: '31/12/2026',
  },
  'M. Moreno': {
    nombre_completo: 'Damián Marcelino Moreno',
    imagen: 'https://img.a.transfermarkt.technology/portrait/big/456617-1721935774.png',
    representante: null,
    valor_mercado: 5_000_000,
    valor_mercado_fmt: '€5,00M',
    fin_contrato: '31/12/2026',
  },
  'D. Aquino': {
    nombre_completo: 'Dylan Fabricio Aquino',
    imagen: 'https://img.a.transfermarkt.technology/portrait/big/1150206-1721936320.png',
    representante: 'TDL Company',
    valor_mercado: 2_200_000,
    valor_mercado_fmt: '€2,20M',
    fin_contrato: '31/12/2027',
  },
  'B. Cabrera': {
    nombre_completo: 'Bruno Cabrera',
    imagen: 'https://img.a.transfermarkt.technology/portrait/big/1235860-1721936326.png',
    representante: null,
    valor_mercado: 200_000,
    valor_mercado_fmt: '€200K',
    fin_contrato: '31/12/2026',
  },
  'A. Medina': {
    nombre_completo: 'Diego Agustín Medina',
    imagen: 'https://img.a.transfermarkt.technology/portrait/big/1294453-1758651559.jpg',
    representante: null,
    valor_mercado: 4_500_000,
    valor_mercado_fmt: '€4,50M',
    fin_contrato: '31/12/2028',
  },
  'R. De Jesús': {
    nombre_completo: 'Ronaldo Dejesús López',
    imagen: 'https://img.a.transfermarkt.technology/portrait/big/847074-1755012394.png',
    representante: 'EagleEye',
    valor_mercado: 1_500_000,
    valor_mercado_fmt: '€1,50M',
    fin_contrato: '31/12/2027',
  },
  'L. Besozzi': {
    nombre_completo: 'Lucas Agustín Besozzi',
    imagen: 'https://img.a.transfermarkt.technology/portrait/big/829381-1721935796.png',
    representante: 'Claudio Caniggia',
    valor_mercado: 300_000,
    valor_mercado_fmt: '€300K',
    fin_contrato: '31/12/2028',
  },
}

export default TM_DATA
