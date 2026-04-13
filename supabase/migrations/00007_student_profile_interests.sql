-- ============================================
-- 수강생 프로필 확장: 경력/관심사 + AI 역량 진단
-- ============================================

-- 1. profiles 테이블에 경력/관심사 컬럼 추가
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS experience_level TEXT CHECK (experience_level IN ('beginner', 'junior', 'mid', 'senior')),
  ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';

-- 2. AI 역량 진단 결과 저장 테이블
CREATE TABLE IF NOT EXISTS skill_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  academy_id UUID NOT NULL REFERENCES academies(id),
  assessment_type TEXT NOT NULL DEFAULT 'initial',
  skill_scores JSONB NOT NULL DEFAULT '{}',
  overall_level TEXT CHECK (overall_level IN ('beginner', 'elementary', 'intermediate', 'advanced', 'expert')),
  recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE skill_assessments ENABLE ROW LEVEL SECURITY;

-- 수강생 본인 + 강사/원장 조회 가능
CREATE POLICY "skill_assessments_select" ON skill_assessments
  FOR SELECT USING (
    student_id = auth.uid() OR get_my_role() IN ('owner', 'teacher')
  );

CREATE POLICY "skill_assessments_insert" ON skill_assessments
  FOR INSERT WITH CHECK (
    student_id = auth.uid() OR get_my_role() IN ('owner', 'teacher')
  );

CREATE INDEX IF NOT EXISTS idx_skill_assessments_student ON skill_assessments(student_id);
