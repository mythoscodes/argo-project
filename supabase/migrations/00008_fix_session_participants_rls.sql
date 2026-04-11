-- 00008_fix_session_participants_rls.sql
-- 목적: session_participants RLS 정책 정리 + INSERT academy 격리 강화
--
-- 배경:
--   00001에서 생성된 구 정책 2개가 00006에서 DROP되지 않아 현재 4개 정책이 누적 활성.
--   Permissive(OR) RLS에서 `participants_insert_self`(00006)는 student_id 체크만 하므로
--   academy 교차 참여 및 비활성 세션 참여가 Supabase 직접 호출 시 허용되는 취약점 존재.
--
-- 롤백: 필요 시 이전 정책을 수동 재생성 필요 (아래 주석 참고)

-- ============================================================
-- 1. 구 정책 명시적 DROP (00001에서 생성, 00006에서 미삭제)
-- ============================================================
DROP POLICY IF EXISTS "participants_select_same_session" ON session_participants;
DROP POLICY IF EXISTS "participants_insert_student" ON session_participants;

-- ============================================================
-- 2. 00006의 약한 INSERT 정책 교체
--    participants_insert_self: student_id 체크만 → academy + active 체크 추가
-- ============================================================
DROP POLICY IF EXISTS "participants_insert_self" ON session_participants;

CREATE POLICY "participants_insert_student_academy_active" ON session_participants
  FOR INSERT WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM sessions
      WHERE id = session_id
        AND status = 'active'
        AND academy_id = get_my_academy_id()
    )
  );

-- ============================================================
-- 3. SELECT 정책 유지
--    participants_select_same_academy (00006): get_my_academy_id() 기반, 정상
-- ============================================================
-- 변경 없음.

-- ============================================================
-- 최종 활성 정책 (이 마이그레이션 후):
--   SELECT: participants_select_same_academy (00006)
--   INSERT: participants_insert_student_academy_active (00008, 신규)
-- ============================================================
