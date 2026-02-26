-- ============================================================
-- Trading Academy Database Schema
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL,
  streak_count INT DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning Levels (0-4)
CREATE TABLE IF NOT EXISTS levels (
  id SERIAL PRIMARY KEY,
  order_num INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50)
);

-- Lessons within each level
CREATE TABLE IF NOT EXISTS lessons (
  id SERIAL PRIMARY KEY,
  level_id INT REFERENCES levels(id) ON DELETE CASCADE,
  order_num INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  visual_type VARCHAR(50),           -- 'candlestick' | 'diagram' | null
  visual_config JSONB,               -- chart data or diagram config
  common_mistakes JSONB NOT NULL DEFAULT '[]',  -- array of strings
  key_takeaways JSONB NOT NULL DEFAULT '[]',    -- array of strings
  estimated_minutes INT DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz questions per lesson
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  lesson_id INT REFERENCES lessons(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,         -- 'multiple_choice' | 'true_false' | 'visual'
  question_text TEXT NOT NULL,
  options JSONB,                     -- array of strings for MC, null for T/F
  correct_answer VARCHAR(255) NOT NULL,
  explanation TEXT,
  visual_config JSONB,               -- chart overlay for visual questions
  order_num INT NOT NULL DEFAULT 0
);

-- Per-user lesson progress
CREATE TABLE IF NOT EXISTS user_lesson_progress (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INT REFERENCES lessons(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'not_started',  -- 'not_started' | 'in_progress' | 'completed'
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, lesson_id)
);

-- Quiz attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INT REFERENCES lessons(id) ON DELETE CASCADE,
  score INT NOT NULL,                -- percentage 0-100
  total_questions INT NOT NULL,
  correct_count INT NOT NULL,
  passed BOOLEAN NOT NULL,           -- score >= 70
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual answers within a quiz attempt
CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
  id SERIAL PRIMARY KEY,
  attempt_id INT REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id INT REFERENCES questions(id) ON DELETE CASCADE,
  user_answer VARCHAR(255),
  is_correct BOOLEAN NOT NULL
);

-- Mastery score per lesson per user
CREATE TABLE IF NOT EXISTS mastery_scores (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INT REFERENCES lessons(id) ON DELETE CASCADE,
  score INT DEFAULT 0,               -- 0-100 rolling average
  attempts_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Spaced repetition review queue
CREATE TABLE IF NOT EXISTS review_queue (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INT REFERENCES lessons(id) ON DELETE CASCADE,
  question_id INT REFERENCES questions(id) ON DELETE SET NULL,
  next_review_date DATE NOT NULL,
  interval_days INT DEFAULT 1,
  ease_factor NUMERIC(4,2) DEFAULT 2.50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chart practice drills
CREATE TABLE IF NOT EXISTS drills (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  level_required INT DEFAULT 0,
  chart_config JSONB NOT NULL,       -- { data: CandleData[], settings: {} }
  answer_set JSONB NOT NULL,         -- { zones: [], points: [], description: '' }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drill attempt submissions
CREATE TABLE IF NOT EXISTS drill_attempts (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  drill_id INT REFERENCES drills(id) ON DELETE CASCADE,
  user_input JSONB,                  -- zones/points user submitted
  score INT,                         -- 0-100
  feedback JSONB,                    -- per-element correct/incorrect
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trade journal entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  trade_date DATE NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  direction VARCHAR(10) NOT NULL,    -- 'long' | 'short'
  entry_reason TEXT,
  stop_loss NUMERIC(14,4),
  take_profit NUMERIC(14,4),
  entry_price NUMERIC(14,4),
  exit_price NUMERIC(14,4),
  planned_rr NUMERIC(6,2),
  actual_rr NUMERIC(6,2),
  result VARCHAR(20),                -- 'win' | 'loss' | 'breakeven'
  notes TEXT,
  mistake_tags JSONB DEFAULT '[]',   -- array of strings
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_lessons_level_id ON lessons(level_id);
CREATE INDEX IF NOT EXISTS idx_questions_lesson_id ON questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_ulp_user_id ON user_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_ulp_lesson_id ON user_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_lesson ON quiz_attempts(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_mastery_user_lesson ON mastery_scores(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_review_queue_user_date ON review_queue(user_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journal_entries(user_id, trade_date);
