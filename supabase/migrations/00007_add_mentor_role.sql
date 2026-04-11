-- ============================================
-- mentor role 추가
-- 배경: profiles.role CHECK에 'mentor'가 없어 DB INSERT 단계에서 violation 발생
-- 동시에: consultation_notes INSERT RLS에서 role 체크가 제거된 회귀 복원 (00006 회귀)
-- ============================================

-- 1. profiles.role CHECK 제약에 'mentor' 추가
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'teacher', 'student', 'mentor'));

-- 2. consultation_notes INSERT RLS role 체크 복원
--    00006에서 role 체크가 제거되어 수강생도 instructor_id=self 로 상담 기록 삽입 가능
--    → academy_id 격리 + role 체크를 함께 적용
DROP POLICY IF EXISTS "consultation_notes_insert" ON consultation_notes;
CREATE POLICY "consultation_notes_insert" ON consultation_notes
  FOR INSERT WITH CHECK (
    instructor_id = auth.uid()
    AND academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'teacher', 'mentor')
  );

-- 3. consultation_notes SELECT RLS — mentor 조회 범위 확장 (N-9)
--    기존: instructor_id = auth.uid() OR get_my_role() = 'owner'
--    mentor는 학원 내 모든 상담 이력 조회 가능 (수강생 통합 케어를 위해 owner와 동급)
DROP POLICY IF EXISTS "consultation_notes_select" ON consultation_notes;
CREATE POLICY "consultation_notes_select" ON consultation_notes
  FOR SELECT USING (
    academy_id = get_my_academy_id()
    AND (
      instructor_id = auth.uid()
      OR get_my_role() IN ('owner', 'mentor')
    )
  );
