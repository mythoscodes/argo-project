---
type: rls
id: rls-responses
related:
  - "[[rls-sessions]]"
  - "[[rls-profiles]]"
  - "[[api-sessions]]"
  - "[[hook-use-realtime]]"
  - "[[concept-academy-isolation]]"
sources:
  - "supabase/migrations/00001_initial_schema.sql"
  - "supabase/migrations/00006_fix_profiles_rls_recursion.sql"
  - "docs/tc/student-result.md#SSR-RLS"
updated: 2026-04-11
owner: analyst-2
---

# rls-responses — responses 테이블 RLS 정책

## Summary

수강생이 제출한 퀴즈 응답의 RLS. SELECT는 학원 단위 격리 (`get_my_academy_id()` 기반), INSERT는 본인만 가능. Realtime 구독도 이 RLS를 통과한다.

## Key Claims

- SELECT: `session_id IN (SELECT id FROM sessions WHERE academy_id = get_my_academy_id())` — 같은 학원 소속이면 모든 응답 조회 가능 (강사가 히트맵을 위해 전체 응답을 봐야 함).
- INSERT: `student_id = auth.uid()` — 본인 응답만 제출 가능.
- `is_correct` 필드: RLS는 row 전체 반환, 타 수강생의 `is_correct`도 SELECT 가능 — `GET /api/responses?sessionId` API에서 `student_id = user.id` 추가 필터로 본인 응답만 반환.
- Realtime 구독(`hook-use-realtime`)도 이 RLS 적용 — 타 수강생 응답은 push 수신 불가.

## Intuition / Why

강사(히트맵 F4)는 세션 내 모든 수강생 응답을 봐야 하고, 수강생 본인(결과 F3)은 자신의 응답만 봐야 한다. RLS는 학원 단위로만 격리 — 수강생 개인 격리는 API 레벨에서 `student_id = user.id` 필터로 처리.

## Details

```sql
-- SELECT: 같은 학원 내 세션의 응답 전체
CREATE POLICY "responses_select_same_academy" ON responses
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE academy_id = get_my_academy_id())
  );

-- INSERT: 본인 응답만
CREATE POLICY "responses_insert_student" ON responses
  FOR INSERT WITH CHECK (student_id = auth.uid());
```

## Connections

- [[rls-sessions]] — upstream: responses SELECT 서브쿼리가 sessions 테이블 참조
- [[rls-profiles]] — upstream: `get_my_academy_id()` 함수 사용
- [[hook-use-realtime]] — downstream: Realtime 구독이 이 RLS 통과하여 응답 수신
- [[concept-academy-isolation]] — see-also: academy_id 격리 원칙 적용

## Gotchas

- **수강생 간 격리는 API 레벨**: RLS만으로는 동 학원 타 수강생 응답 조회가 가능. `/api/responses` GET에서 `student_id = user.id` 필터를 반드시 추가해야 한다. 누락 시 A 수강생이 B의 `is_correct`를 볼 수 있다.
- **Realtime RLS**: Supabase Realtime도 RLS를 따른다 — 수강생이 자신의 INSERT 이벤트만 수신. 강사는 세션 내 전체 INSERT 수신.
- **UPDATE 정책 없음**: 응답 수정 불가 (기본 DENY). 한 번 제출한 응답은 변경 불가.

## Changelog

- 2026-04-11 — 00006: `get_my_academy_id()` 기반으로 정책 교체
- 초기 — 00001: 기본 responses RLS
