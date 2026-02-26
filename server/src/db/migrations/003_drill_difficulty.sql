-- Add difficulty tier and concept tags to drills
ALTER TABLE drills
  ADD COLUMN IF NOT EXISTS difficulty VARCHAR(10) NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
