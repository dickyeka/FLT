CREATE TABLE IF NOT EXISTS workout_sessions (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  day_type TEXT NOT NULL,
  exercises JSONB NOT NULL DEFAULT '{}'::jsonb,
  cardio BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  kcal INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sessions_unique UNIQUE (date, day_type)
);

CREATE TABLE IF NOT EXISTS weights (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  weight NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_sessions'
  ) THEN
    CREATE TRIGGER set_updated_at_sessions
    BEFORE UPDATE ON workout_sessions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_weights'
  ) THEN
    CREATE TRIGGER set_updated_at_weights
    BEFORE UPDATE ON weights
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;
