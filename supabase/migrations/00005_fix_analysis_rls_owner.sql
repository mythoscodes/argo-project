-- ============================================
-- analysis_results SELECT RLS: 원장(owner)도 같은 학원 세션의 분석 결과 조회 허용
-- ============================================

-- 기존 정책 삭제 후 확장된 정책으로 교체
DROP POLICY IF EXISTS "analysis_select_teacher" ON analysis_results;

CREATE POLICY "analysis_select_teacher_or_owner" ON analysis_results
  FOR SELECT USING (
    session_id IN (
      SELECT s.id FROM sessions s
      WHERE s.teacher_id = auth.uid()
         OR s.academy_id IN (
           SELECT academy_id FROM profiles WHERE id = auth.uid() AND role = 'owner'
         )
    )
  );
