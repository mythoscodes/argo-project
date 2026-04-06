-- ============================================
-- F9 멘토 뷰: consultation_notes + courses 테이블
-- 롤백: DROP TABLE consultation_notes, courses CASCADE;
-- ============================================

-- === 1. courses (내부 강의 카탈로그) ===
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academies(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'programming', 'security', 'network',
    'data_science', 'ai_development', 'ai_software'
  )),
  topics TEXT[] NOT NULL DEFAULT '{}',
  instructor_name TEXT NOT NULL,
  schedule TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_select_same_academy" ON courses
  FOR SELECT USING (
    academy_id IN (SELECT academy_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "courses_insert_teacher" ON courses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'teacher')
    )
    AND academy_id IN (SELECT academy_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "courses_update_teacher" ON courses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'teacher')
    )
    AND academy_id IN (SELECT academy_id FROM profiles WHERE id = auth.uid())
  );

-- === 2. consultation_notes (상담 기록) ===
CREATE TABLE consultation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES profiles(id),
  student_id UUID NOT NULL REFERENCES profiles(id),
  academy_id UUID NOT NULL REFERENCES academies(id),
  type TEXT NOT NULL CHECK (type IN ('학습부진', '진로', '출결', '기타')),
  content TEXT NOT NULL,
  next_consultation_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE consultation_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultations_select_instructor" ON consultation_notes
  FOR SELECT USING (instructor_id = auth.uid());

CREATE POLICY "consultations_insert_instructor" ON consultation_notes
  FOR INSERT WITH CHECK (
    instructor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'teacher')
    )
  );

-- === 인덱스 ===
CREATE INDEX idx_courses_academy ON courses(academy_id);
CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_consultation_notes_instructor ON consultation_notes(instructor_id);
CREATE INDEX idx_consultation_notes_student ON consultation_notes(student_id);
CREATE INDEX idx_consultation_notes_academy ON consultation_notes(academy_id);
