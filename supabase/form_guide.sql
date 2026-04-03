-- NOTE: form_guide table is no longer used by the Dashboard.
-- The Dashboard derives form directly from src/data/lanus2026.ts (single source of truth).
-- This file is kept for reference only.

CREATE TABLE IF NOT EXISTS form_guide (
  id SERIAL PRIMARY KEY,
  match_date DATE NOT NULL,
  opponent TEXT NOT NULL,
  was_home BOOLEAN NOT NULL,
  goals_for INTEGER NOT NULL,
  goals_against INTEGER NOT NULL,
  result CHAR(1) NOT NULL CHECK (result IN ('W', 'D', 'L')),
  competition TEXT NOT NULL DEFAULT 'Liga Profesional'
);
