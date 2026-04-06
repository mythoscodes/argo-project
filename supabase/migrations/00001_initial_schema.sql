-- ============================================
-- Argos 초기 스키마 마이그레이션
-- 롤백: DROP TABLE plan_features, student_reports, analysis_results, responses, quizzes, session_participants, sessions, profiles, academies CASCADE;
-- ============================================

-- === updated_at 자동 갱신 트리거 함수 ===
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- === 1. academies ===
CREATE TABLE academies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  branch_code TEXT UNIQUE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'premium')),
  max_students INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE academies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "academies_select_own" ON academies
  FOR SELECT USING (
    id IN (SELECT academy_id FROM profiles WHERE id = auth.uid())
  );

-- === 2. profiles ===
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  academy_id UUID NOT NULL REFERENCES academies(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'teacher', 'student')),
  display_name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_same_academy" ON profiles
  FOR SELECT USING (
    academy_id IN (SELECT academy_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- === 3. sessions ===
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id),
  academy_id UUID NOT NULL REFERENCES academies(id),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  course_category TEXT CHECK (course_category IN (
    'programming', 'security', 'network',
    'data_science', 'ai_development', 'ai_software'
  )),
  topics JSONB NOT NULL DEFAULT '[]',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  join_code TEXT UNIQUE,
  anonymous_mode BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_select_same_academy" ON sessions
  FOR SELECT USING (
    academy_id IN (SELECT academy_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "sessions_insert_teacher" ON sessions
  FOR INSERT WITH CHECK (
    teacher_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'teacher')
    )
  );

CREATE POLICY "sessions_update_teacher" ON sessions
  FOR UPDATE USING (teacher_id = auth.uid());

-- === 4. session_participants ===
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants_select_same_session" ON session_participants
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM sessions WHERE academy_id IN (
        SELECT academy_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "participants_insert_student" ON session_participants
  FOR INSERT WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM sessions WHERE id = session_id AND status = 'active'
    )
  );

-- === 5. quizzes ===
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN (
    'multiple_choice', 'true_false',
    'code_output', 'find_bug', 'fill_blank'
  )),
  code_snippet TEXT,
  code_language TEXT,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  topic_tag TEXT NOT NULL,
  misconception_tags JSONB,
  round_number INTEGER DEFAULT 1,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quizzes_select_same_academy" ON quizzes
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM sessions WHERE academy_id IN (
        SELECT academy_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "quizzes_insert_teacher" ON quizzes
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM sessions WHERE teacher_id = auth.uid()
    )
  );

-- === 6. responses ===
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id),
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  round_number INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quiz_id, student_id, round_number)
);

ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "responses_select_same_academy" ON responses
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM sessions WHERE academy_id IN (
        SELECT academy_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "responses_insert_student" ON responses
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- === 7. analysis_results ===
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('realtime', 'post_session')),
  understanding_scores JSONB,
  weak_topics JSONB,
  misconception_clusters JSONB,
  coaching_suggestion TEXT,
  full_report TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analysis_select_teacher" ON analysis_results
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM sessions WHERE teacher_id = auth.uid()
    )
  );

-- === 8. student_reports ===
CREATE TABLE student_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  academy_id UUID NOT NULL REFERENCES academies(id),
  session_id UUID REFERENCES sessions(id),
  report_type TEXT NOT NULL CHECK (report_type IN ('session', 'weekly', 'cumulative')),
  understanding_summary JSONB,
  weak_topics JSONB,
  recommendations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE student_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select_own" ON student_reports
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "reports_select_teacher" ON student_reports
  FOR SELECT USING (
    academy_id IN (
      SELECT academy_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'teacher')
    )
  );

-- === 9. plan_features ===
CREATE TABLE plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan TEXT NOT NULL CHECK (plan IN ('free', 'basic', 'premium')),
  feature_key TEXT NOT NULL,
  feature_value JSONB NOT NULL,
  UNIQUE(plan, feature_key)
);

ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_features_select_all" ON plan_features
  FOR SELECT USING (true);

-- === 인덱스 ===
CREATE INDEX idx_profiles_academy ON profiles(academy_id);
CREATE INDEX idx_sessions_academy ON sessions(academy_id);
CREATE INDEX idx_sessions_teacher ON sessions(teacher_id);
CREATE INDEX idx_sessions_join_code ON sessions(join_code);
CREATE INDEX idx_quizzes_session ON quizzes(session_id);
CREATE INDEX idx_responses_session ON responses(session_id);
CREATE INDEX idx_responses_quiz ON responses(quiz_id);
CREATE INDEX idx_student_reports_student ON student_reports(student_id);
