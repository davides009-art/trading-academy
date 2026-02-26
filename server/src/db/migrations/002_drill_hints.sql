-- Add hint and explanation columns to drills
ALTER TABLE drills
  ADD COLUMN IF NOT EXISTS hint1_text TEXT,
  ADD COLUMN IF NOT EXISTS hint2_text TEXT,
  ADD COLUMN IF NOT EXISTS explanation JSONB DEFAULT '[]';

-- Track hint usage and reveal per drill attempt
ALTER TABLE drill_attempts
  ADD COLUMN IF NOT EXISTS hints_used SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revealed BOOLEAN NOT NULL DEFAULT FALSE;
