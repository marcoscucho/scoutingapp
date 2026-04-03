-- Create ultimo_once table
CREATE TABLE IF NOT EXISTS ultimo_once (
  id SERIAL PRIMARY KEY,
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  formation TEXT NOT NULL DEFAULT '4-3-3',
  match_date DATE NOT NULL,
  opponent TEXT NOT NULL,
  result TEXT NOT NULL
);

-- RLS: anyone can read, only authenticated users can write
ALTER TABLE ultimo_once ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read ultimo_once"
  ON ultimo_once FOR SELECT USING (true);

CREATE POLICY "Authenticated write ultimo_once"
  ON ultimo_once FOR ALL
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Insert lineup: Lanús 0-0 Platense, 01 Abr 2026, Fecha 13 Apertura
-- Fuente: ESPN + Sofascore (confirmado por ambas fuentes)
-- Formación: 4-2-3-1
TRUNCATE TABLE ultimo_once RESTART IDENTITY;

INSERT INTO ultimo_once (number, name, position, x, y, formation, match_date, opponent, result) VALUES
  (26, 'Nahuel Losada',    'Goalkeeper', 50, 131, '4-2-3-1', '2026-04-01', 'Platense', '0-0'),
  (4,  'N. Morgantini',    'Defender',   82, 113, '4-2-3-1', '2026-04-01', 'Platense', '0-0'),
  (24, 'Carlos Izquierdoz','Defender',   62, 114, '4-2-3-1', '2026-04-01', 'Platense', '0-0'),
  (35, 'Ronaldo Dejesús',  'Defender',   38, 114, '4-2-3-1', '2026-04-01', 'Platense', '0-0'),
  (6,  'Sasha Marcich',    'Defender',   18, 113, '4-2-3-1', '2026-04-01', 'Platense', '0-0'),
  (30, 'Agustín Cardozo',  'Midfielder', 65,  92, '4-2-3-1', '2026-04-01', 'Platense', '0-0'),
  (17, 'Agustín Medina',   'Midfielder', 35,  92, '4-2-3-1', '2026-04-01', 'Platense', '0-0'),
  (11, 'Eduardo Salvio',   'Forward',    76,  68, '4-2-3-1', '2026-04-01', 'Platense', '0-0'),
  (20, 'Bruno Cabrera',    'Midfielder', 50,  65, '4-2-3-1', '2026-04-01', 'Platense', '0-0'),
  (16, 'Matías Sepúlveda', 'Midfielder', 24,  68, '4-2-3-1', '2026-04-01', 'Platense', '0-0'),
  (19, 'Yoshan Valois',    'Forward',    50,  35, '4-2-3-1', '2026-04-01', 'Platense', '0-0');
