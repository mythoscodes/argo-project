-- ============================================
-- analysis_type CHECK 제약조건 확장
-- coaching, understanding 타입 추가
-- ============================================

ALTER TABLE analysis_results
  DROP CONSTRAINT IF EXISTS analysis_results_analysis_type_check;

ALTER TABLE analysis_results
  ADD CONSTRAINT analysis_results_analysis_type_check
  CHECK (analysis_type IN ('realtime', 'post_session', 'coaching', 'understanding'));
