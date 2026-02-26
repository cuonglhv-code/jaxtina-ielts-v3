-- ═══════════════════════════════════════════════════════════════════════════════
-- JAXTINA IELTS WRITING TUTOR — COMPLETE DATABASE MIGRATION
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. PROFILES TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL DEFAULT '',
  age           INT,
  address       TEXT,
  phone         TEXT,
  current_band  NUMERIC(2,1) DEFAULT 0.0,
  target_band   NUMERIC(2,1) DEFAULT 6.5,
  role          TEXT NOT NULL DEFAULT 'student'
                  CHECK (role IN ('student','teacher','admin')),
  onboarded     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints only if they don't already exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_current_band_range'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_current_band_range
      CHECK (current_band >= 0 AND current_band <= 9);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_target_band_range'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_target_band_range
      CHECK (target_band >= 0 AND target_band <= 9);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_age_range'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_age_range
      CHECK (age IS NULL OR (age >= 10 AND age <= 100));
  END IF;
END $$;

-- ── 2. AUTO-CREATE PROFILE TRIGGER ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 3. RLS ON PROFILES ───────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own"   ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own"   ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"   ON profiles;
DROP POLICY IF EXISTS "profiles_select_staff" ON profiles;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_select_staff"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('teacher','admin')
    )
  );

-- ── 4. WRITING PROMPTS TABLE ─────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE task1_type AS ENUM ('graph','table','process','map');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task2_question_type AS ENUM (
    'agree_disagree',
    'discuss_both_views',
    'problem_solution',
    'advantages_disadvantages',
    'two_direct_questions'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS writing_prompts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task                 TEXT NOT NULL CHECK (task IN ('task1','task2')),
  task1_type           task1_type          NULL,
  task2_question_type  task2_question_type NULL,
  prompt_text          TEXT NOT NULL,
  image_url            TEXT NULL,
  visual_description   TEXT NULL,
  metadata             JSONB DEFAULT '{}',
  difficulty           SMALLINT DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 3),
  topic_tags           TEXT[] DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. RLS ON WRITING PROMPTS ────────────────────────────────────────────────
ALTER TABLE writing_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prompts_select_authenticated" ON writing_prompts;
DROP POLICY IF EXISTS "prompts_insert_staff"         ON writing_prompts;
DROP POLICY IF EXISTS "prompts_update_staff"         ON writing_prompts;
DROP POLICY IF EXISTS "prompts_delete_admin"         ON writing_prompts;

CREATE POLICY "prompts_select_authenticated"
  ON writing_prompts FOR SELECT TO authenticated USING (true);

CREATE POLICY "prompts_insert_staff"
  ON writing_prompts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher','admin'))
  );

CREATE POLICY "prompts_update_staff"
  ON writing_prompts FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher','admin'))
  );

CREATE POLICY "prompts_delete_admin"
  ON writing_prompts FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 6. SUBMISSIONS TABLE ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prompt_id       UUID REFERENCES writing_prompts(id) ON DELETE SET NULL,
  task_type       TEXT NOT NULL CHECK (task_type IN ('task1','task2')),
  essay_text      TEXT NOT NULL,
  word_count      INT,
  overall_band    NUMERIC(2,1),
  criteria_scores JSONB,
  feedback_json   JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. RLS ON SUBMISSIONS ────────────────────────────────────────────────────
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "submissions_select_own"   ON submissions;
DROP POLICY IF EXISTS "submissions_insert_own"   ON submissions;
DROP POLICY IF EXISTS "submissions_select_staff" ON submissions;

CREATE POLICY "submissions_select_own"
  ON submissions FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "submissions_insert_own"
  ON submissions FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "submissions_select_staff"
  ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('teacher','admin')
    )
  );

-- ── 8. SEED DATA — WRITING PROMPTS ───────────────────────────────────────────
INSERT INTO writing_prompts (task, task2_question_type, prompt_text, difficulty, topic_tags) VALUES
(
  'task2', 'discuss_both_views',
  'Some people believe that the best way to improve public health is by increasing the number of sports facilities. Others, however, think that this would have little effect on public health and that other measures are required.' || E'\n\n' || 'Discuss both views and give your own opinion.',
  2, ARRAY['health','society']
),
(
  'task2', 'problem_solution',
  'In many cities, the amount of traffic is increasing, causing problems of pollution and gridlock.' || E'\n\n' || 'What are the causes of this problem? What measures could be taken to reduce it?',
  2, ARRAY['transport','environment']
),
(
  'task2', 'agree_disagree',
  'Many people believe that social media has had a profoundly negative effect on both individuals and society as a whole.' || E'\n\n' || 'To what extent do you agree or disagree with this statement?',
  2, ARRAY['technology','society']
),
(
  'task2', 'advantages_disadvantages',
  'In many countries, more and more people are choosing to work from home rather than commute to an office.' || E'\n\n' || 'What are the advantages and disadvantages of this trend?',
  2, ARRAY['work','technology']
),
(
  'task2', 'two_direct_questions',
  'In some countries, young people are encouraged to work or travel for a year between finishing high school and starting university.' || E'\n\n' || 'What are the benefits and drawbacks of taking a gap year? Should governments encourage this practice?',
  2, ARRAY['education','youth']
),
(
  'task2', 'agree_disagree',
  'Some people argue that the government should invest more money in public transport rather than building new roads.' || E'\n\n' || 'To what extent do you agree or disagree?',
  2, ARRAY['transport','government']
),
(
  'task2', 'discuss_both_views',
  'Some people think that children should begin formal education at a very early age. Others believe that children should not start school until they are older.' || E'\n\n' || 'Discuss both views and give your own opinion.',
  2, ARRAY['education','children']
);

INSERT INTO writing_prompts (task, task1_type, prompt_text, visual_description, difficulty, metadata, topic_tags) VALUES
(
  'task1', 'graph',
  'The bar chart below shows the percentage of students achieving a band score of 7 or above in each IELTS section (Reading, Listening, Writing, Speaking) at three language schools in Ho Chi Minh City in 2024.' || E'\n\n' || 'Summarise the information by selecting and reporting the main features, and make comparisons where relevant.' || E'\n\n' || '[Data: Jaxtina — Reading 48%, Listening 52%, Writing 31%, Speaking 38% | British Council — Reading 55%, Listening 60%, Writing 40%, Speaking 42% | IDP — Reading 42%, Listening 45%, Writing 28%, Speaking 35%]',
  'A grouped bar chart. Three school groups: Jaxtina, British Council, IDP. Four bars per group representing IELTS sections. British Council leads in all sections. Writing is the weakest section across all schools. Listening is the strongest for all three.',
  2,
  '{"chart_type":"bar","categories":["Reading","Listening","Writing","Speaking"],"groups":["Jaxtina","British Council","IDP"]}',
  ARRAY['education','Vietnam']
),
(
  'task1', 'process',
  'The diagram below illustrates the process of water purification in a municipal treatment plant.' || E'\n\n' || 'Summarise the information by selecting and reporting the main features in a logically sequenced description.' || E'\n\n' || '[Stages: 1. Raw water intake from river → 2. Screening (large debris removed by metal grilles) → 3. Coagulation and Flocculation (aluminium sulphate added, particles clump together) → 4. Sedimentation (heavy clumps sink to bottom) → 5. Filtration (water passes through sand and gravel layers) → 6. Disinfection (chlorine added to kill bacteria) → 7. Clean water stored in reservoir]',
  'A linear 7-stage process diagram. Flow moves left to right. Raw water enters from a river on the left; clean water exits to a reservoir on the right. Chemicals are added at stages 3 and 6. Waste sludge is removed at stage 4.',
  2,
  '{"stages":7,"flow":"linear","inputs":["aluminium sulphate","chlorine"],"output":"clean drinking water"}',
  ARRAY['environment','science']
),
(
  'task1', 'map',
  'The two maps below show the layout of a town centre in 1990 and 2024.' || E'\n\n' || 'Summarise the information by selecting and reporting the main features, and make comparisons where relevant.' || E'\n\n' || '[1990: central park (north), shopping street (east), two residential areas (north-west and south), cinema (west), library (south-east)] [2024: park replaced by multi-storey car park, cinema demolished and replaced by shopping mall, new hotel built on north side, library retained, southern residential area replaced by office blocks]',
  'Two bird-eye maps of the same town centre. Map 1 (1990) shows a green park in the north, a cinema on the west side, a library in the south-east, a shopping street on the east, and residential areas. Map 2 (2024) shows the park gone, replaced by a car park; the cinema replaced by a larger shopping mall; a new hotel; the library unchanged; one residential area replaced by offices.',
  2,
  '{"years":[1990,2024],"key_changes":["park to car park","cinema to shopping mall","new hotel added","south residential to offices"],"retained":["library","north-west residential"]}',
  ARRAY['urban development','change over time']
),
(
  'task1', 'table',
  'The table below shows the average monthly household expenditure (in USD) in four categories across three countries in 2023.' || E'\n\n' || 'Summarise the information by selecting and reporting the main features, and make comparisons where relevant.' || E'\n\n' || '[Food: Vietnam $260, Germany $480, Australia $520 | Transport: Vietnam $45, Germany $110, Australia $130 | Housing: Vietnam $120, Germany $620, Australia $780 | Leisure: Vietnam $30, Germany $95, Australia $140]',
  'A table with 4 rows (Food, Transport, Housing, Leisure) and 3 columns (Vietnam, Germany, Australia). Housing is the largest expenditure category for Germany and Australia. Vietnam spends far less in all categories. Leisure is the smallest category for Vietnam but significant for Germany and Australia.',
  2,
  '{"columns":["Vietnam","Germany","Australia"],"rows":["Food","Transport","Housing","Leisure"],"year":2023,"unit":"USD per month"}',
  ARRAY['economics','lifestyle','international']
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- After running this, go to:
-- Authentication → URL Configuration → set Site URL to your domain
-- Then set your first user as admin:
--   UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
-- ═══════════════════════════════════════════════════════════════════════════════
