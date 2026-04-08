-- ============================================
-- profiles RLS 무한 재귀 수정
-- 원인: profiles_select_same_academy 정책이 profiles를 서브쿼리 → 같은 RLS 재적용 → 무한 루프
-- 해결: SECURITY DEFINER 함수로 RLS 우회하여 academy_id 조회
-- ============================================

-- 1. 현재 유저의 academy_id를 반환하는 SECURITY DEFINER 함수
--    이 함수 내부에서는 호출자의 RLS가 아닌 함수 소유자(superuser) 권한으로 실행
CREATE OR REPLACE FUNCTION get_my_academy_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT academy_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. 현재 유저의 role을 반환하는 SECURITY DEFINER 함수
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ============================
-- profiles 테이블 정책 교체
-- ============================
DROP POLICY IF EXISTS "profiles_select_same_academy" ON profiles;
CREATE POLICY "profiles_select_same_academy" ON profiles
  FOR SELECT USING (
    academy_id = get_my_academy_id()
  );

-- profiles_update_own 은 id = auth.uid() 이므로 재귀 없음 → 유지

-- ============================
-- academies 테이블 정책 교체
-- ============================
DROP POLICY IF EXISTS "academies_select_own" ON academies;
CREATE POLICY "academies_select_own" ON academies
  FOR SELECT USING (
    id = get_my_academy_id()
  );

-- ============================
-- sessions 테이블 정책 교체
-- ============================
DROP POLICY IF EXISTS "sessions_select_same_academy" ON sessions;
CREATE POLICY "sessions_select_same_academy" ON sessions
  FOR SELECT USING (
    academy_id = get_my_academy_id()
  );

DROP POLICY IF EXISTS "sessions_insert_teacher" ON sessions;
CREATE POLICY "sessions_insert_teacher" ON sessions
  FOR INSERT WITH CHECK (
    teacher_id = auth.uid()
    AND academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'teacher')
  );

DROP POLICY IF EXISTS "sessions_update_own" ON sessions;
CREATE POLICY "sessions_update_own" ON sessions
  FOR UPDATE USING (
    teacher_id = auth.uid()
  );

-- ============================
-- session_participants 정책 교체
-- ============================
DROP POLICY IF EXISTS "participants_select_same_academy" ON session_participants;
CREATE POLICY "participants_select_same_academy" ON session_participants
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE academy_id = get_my_academy_id())
  );

DROP POLICY IF EXISTS "participants_insert_self" ON session_participants;
CREATE POLICY "participants_insert_self" ON session_participants
  FOR INSERT WITH CHECK (
    student_id = auth.uid()
  );

-- ============================
-- quizzes 정책 교체
-- ============================
DROP POLICY IF EXISTS "quizzes_select_same_academy" ON quizzes;
CREATE POLICY "quizzes_select_same_academy" ON quizzes
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE academy_id = get_my_academy_id())
  );

DROP POLICY IF EXISTS "quizzes_insert_teacher" ON quizzes;
CREATE POLICY "quizzes_insert_teacher" ON quizzes
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM sessions
      WHERE teacher_id = auth.uid() AND academy_id = get_my_academy_id()
    )
  );

-- ============================
-- responses 정책 교체
-- ============================
DROP POLICY IF EXISTS "responses_select_same_academy" ON responses;
CREATE POLICY "responses_select_same_academy" ON responses
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE academy_id = get_my_academy_id())
  );

DROP POLICY IF EXISTS "responses_insert_student" ON responses;
CREATE POLICY "responses_insert_student" ON responses
  FOR INSERT WITH CHECK (
    student_id = auth.uid()
  );

-- ============================
-- analysis_results 정책 교체
-- ============================
DROP POLICY IF EXISTS "analysis_select_same_academy" ON analysis_results;
DROP POLICY IF EXISTS "analysis_results_select_same_academy" ON analysis_results;
DROP POLICY IF EXISTS "analysis_results_select_owner" ON analysis_results;
CREATE POLICY "analysis_results_select" ON analysis_results
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE academy_id = get_my_academy_id())
  );

DROP POLICY IF EXISTS "analysis_insert_teacher" ON analysis_results;
DROP POLICY IF EXISTS "analysis_results_insert_teacher" ON analysis_results;
CREATE POLICY "analysis_results_insert" ON analysis_results
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM sessions
      WHERE teacher_id = auth.uid() AND academy_id = get_my_academy_id()
    )
  );

-- ============================
-- student_reports 정책 교체
-- ============================
DROP POLICY IF EXISTS "reports_select_same_academy" ON student_reports;
DROP POLICY IF EXISTS "student_reports_select_same_academy" ON student_reports;
CREATE POLICY "student_reports_select" ON student_reports
  FOR SELECT USING (
    academy_id = get_my_academy_id()
  );

DROP POLICY IF EXISTS "reports_insert_teacher" ON student_reports;
DROP POLICY IF EXISTS "student_reports_insert_teacher" ON student_reports;
CREATE POLICY "student_reports_insert" ON student_reports
  FOR INSERT WITH CHECK (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'teacher')
  );

-- ============================
-- courses 정책 교체 (멘토 테이블)
-- ============================
DROP POLICY IF EXISTS "courses_select_same_academy" ON courses;
CREATE POLICY "courses_select_same_academy" ON courses
  FOR SELECT USING (
    academy_id = get_my_academy_id()
  );

-- ============================
-- consultation_notes 정책 교체
-- ============================
DROP POLICY IF EXISTS "consultation_notes_select_instructor" ON consultation_notes;
CREATE POLICY "consultation_notes_select" ON consultation_notes
  FOR SELECT USING (
    academy_id = get_my_academy_id()
    AND (instructor_id = auth.uid() OR get_my_role() = 'owner')
  );

DROP POLICY IF EXISTS "consultation_notes_insert_instructor" ON consultation_notes;
CREATE POLICY "consultation_notes_insert" ON consultation_notes
  FOR INSERT WITH CHECK (
    instructor_id = auth.uid()
    AND academy_id = get_my_academy_id()
  );
