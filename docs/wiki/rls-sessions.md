---
type: rls
id: rls-sessions
related:
  - "[[rls-profiles]]"
  - "[[rls-responses]]"
  - "[[concept-session]]"
  - "[[api-sessions]]"
  - "[[concept-academy-isolation]]"
sources:
  - "supabase/migrations/00001_initial_schema.sql"
  - "supabase/migrations/00006_fix_profiles_rls_recursion.sql"
updated: 2026-04-11
owner: analyst-2
---

# rls-sessions — sessions 테이블 RLS 정책

## Summary

강사가 생성하는 수업 세션의 RLS. academy_id 기반 학원 격리 + teacher_id 기반 수정 제한. `get_my_academy_id()` / `get_my_role()` 함수로 무한 재귀 없이 검증한다.

## Key Claims

- SELECT: `academy_id = get_my_academy_id()` — 같은 학원 소속이면 역할 무관(teacher/student/mentor/owner) 조회 가능.
- INSERT: `teacher_id = auth.uid() AND academy_id = get_my_academy_id() AND get_my_role() IN ('owner', 'teacher')` — student/mentor는 세션 생성 불가.
- UPDATE: `teacher_id = auth.uid()` — 세션 생성자만 수정 가능. 다른 강사의 세션 수정 불가.
- `session_participants` 테이블은 별도 정책 — `sessions` RLS와 독립적으로 관리.
- `join_code` 필드: API 레벨에서 student role에는 응답에서 제외 (RLS는 row 전체를 반환하지만 API가 필터).

## Intuition / Why

세션은 학원(academy_id) 단위로 격리된다. 같은 학원의 모든 역할이 세션 목록을 볼 수 있어야(수강생이 세션 참여, 멘토가 수강생 분석) 하지만, 생성·수정은 강사/원장으로 제한한다.

`join_code` 보안: RLS는 `join_code`를 포함한 row 전체를 반환하지만, API Route(`/api/sessions`)에서 student role에는 `join_code`를 응답에서 제거한다 (ISD-ERR-001 TC, 커밋 `236a658`).

## Details

```sql
-- SELECT: 같은 학원이면 누구나
CREATE POLICY "sessions_select_same_academy" ON sessions
  FOR SELECT USING (academy_id = get_my_academy_id());

-- INSERT: teacher/owner만, 본인 academy_id
CREATE POLICY "sessions_insert_teacher" ON sessions
  FOR INSERT WITH CHECK (
    teacher_id = auth.uid()
    AND academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'teacher')
  );

-- UPDATE: 본인이 만든 세션만
CREATE POLICY "sessions_update_own" ON sessions
  FOR UPDATE USING (teacher_id = auth.uid());
```

## Connections

- [[rls-profiles]] — upstream: `get_my_academy_id()` / `get_my_role()` 함수를 이 파일에서 정의 (00006)
- [[rls-responses]] — downstream: responses RLS가 sessions를 서브쿼리로 참조 (`session_id IN (SELECT id FROM sessions WHERE academy_id = get_my_academy_id())`)
- [[api-sessions]] — downstream: 이 RLS 위에서 동작하는 sessions CRUD API
- [[concept-session]] — see-also: 세션 개념 전체 설명
- [[concept-academy-isolation]] — see-also: academy_id 격리 원칙의 세션 구현

## Gotchas

- **student의 `join_code` 접근**: RLS는 student도 sessions SELECT 가능 → `join_code` 포함 row 반환. API Route 레벨에서 필터링하지 않으면 draft 세션의 join_code가 student에 노출됨. 커밋 `236a658`에서 API 레벨 필터 구현.
- **mentor의 세션 INSERT 차단**: `get_my_role() IN ('owner', 'teacher')` — mentor는 sessions INSERT 불가. `/api/sessions POST` 테스트: MNT-SEC-001 (403 확인).
- **UPDATE 정책 미비**: 현재 UPDATE 정책은 `teacher_id = auth.uid()`만 확인 — `academy_id` 체크 없음. 이론상 다른 학원 강사가 직접 DB 접근 시 UPDATE 가능할 수 있으나, API Route 레벨에서 `academy_id` 추가 필터 권장.

## Changelog

- 2026-04-11 — 00006: `get_my_academy_id()` 기반으로 정책 교체 (무한 재귀 방지)
- 초기 — 00001: 기본 sessions RLS (서브쿼리 방식)
