-- ============================================
-- RLS 정책 보완: INSERT/DELETE 누락 수정
-- analysis_results INSERT, student_reports INSERT, sessions DELETE
-- ============================================

-- analysis_results: 강사가 본인 세션에 대해 INSERT 가능
CREATE POLICY "analysis_insert_teacher" ON analysis_results
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM sessions WHERE teacher_id = auth.uid()
    )
  );

-- student_reports: 강사/원장이 INSERT 가능
CREATE POLICY "reports_insert_teacher" ON student_reports
  FOR INSERT WITH CHECK (
    academy_id IN (
      SELECT academy_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'teacher')
    )
  );

-- student_reports: 수강생 본인도 INSERT 가능 (본인 리포트 생성)
CREATE POLICY "reports_insert_student" ON student_reports
  FOR INSERT WITH CHECK (
    student_id = auth.uid()
  );

-- sessions: 강사가 본인 세션 DELETE 가능
CREATE POLICY "sessions_delete_teacher" ON sessions
  FOR DELETE USING (teacher_id = auth.uid());
