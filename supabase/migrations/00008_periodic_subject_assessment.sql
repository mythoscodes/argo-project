-- ============================================
-- 과목별 정기 역량 진단 확장
-- ============================================

-- 1. skill_assessments 테이블 확장
ALTER TABLE skill_assessments
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS assessment_trigger TEXT DEFAULT 'initial'
    CHECK (assessment_trigger IN ('initial', 'periodic', 'pre_session', 'post_course')),
  ADD COLUMN IF NOT EXISTS progress_delta JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_skill_assessments_subject
  ON skill_assessments(student_id, subject, created_at DESC);

-- 2. 학원 전체 수준 집계용 뷰 (materialized 대신 일반 뷰)
CREATE OR REPLACE VIEW academy_skill_summary AS
SELECT
  sa.academy_id,
  sa.subject,
  sa.overall_level,
  COUNT(DISTINCT sa.student_id) AS student_count,
  AVG((sa.skill_scores->0->>'score')::numeric) AS avg_score
FROM skill_assessments sa
WHERE sa.subject IS NOT NULL
  AND sa.id = (
    SELECT sa2.id FROM skill_assessments sa2
    WHERE sa2.student_id = sa.student_id
      AND sa2.subject = sa.subject
    ORDER BY sa2.created_at DESC
    LIMIT 1
  )
GROUP BY sa.academy_id, sa.subject, sa.overall_level;
