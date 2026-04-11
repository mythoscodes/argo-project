---
type: rls
id: rls-consultation-notes
related:
  - "[[rls-profiles]]"
  - "[[api-mentor-consultations]]"
  - "[[role-mentor]]"
  - "[[concept-academy-isolation]]"
sources:
  - "supabase/migrations/00006_fix_profiles_rls_recursion.sql"
  - "supabase/migrations/00007_add_mentor_role.sql"
  - "docs/scrum/analysis.md"
updated: 2026-04-11
owner: analyst-2
---

# rls-consultation-notes — 상담 기록 테이블 RLS 정책

## Summary

멘토/강사/원장의 수강생 상담 기록을 담는 `consultation_notes` 테이블의 RLS. 00006 회귀로 role 체크가 제거됐다가 00007에서 mentor 포함하여 복원한 역사가 있다.

## Key Claims

- SELECT: `academy_id = get_my_academy_id() AND (instructor_id = auth.uid() OR get_my_role() IN ('owner', 'mentor'))` — 본인 작성 기록, 또는 owner/mentor면 학원 전체 조회 가능. (00007 기준)
- INSERT: `instructor_id = auth.uid() AND academy_id = get_my_academy_id() AND get_my_role() IN ('owner', 'teacher', 'mentor')` — student는 삽입 불가. (00007에서 role 체크 복원)
- 00006 마이그레이션에서 INSERT 정책의 role 체크가 실수로 제거되어 student도 `instructor_id = self`로 삽입 가능했다 — **보안 회귀**.
- 00007에서 `get_my_role() IN ('owner', 'teacher', 'mentor')` 조건 복원 + mentor 추가.

## Intuition / Why

상담 기록은 멘토/강사가 수강생에 대해 작성한다. 수강생이 자신의 상담 기록을 조작할 수 없어야 한다(INSERT 제한). 원장과 멘토는 학원 전체 상담 이력을 볼 수 있어야 통합 케어가 가능하다(SELECT 확장).

00006에서 consultation_notes INSERT에 role 체크가 없어진 것은 "instructor_id = auth.uid()" 조건이 있으니 충분하다고 판단한 실수 — 하지만 student가 자신의 uid를 `instructor_id`에 삽입하면 통과한다. role 체크가 필수.

## Details

```sql
-- INSERT (00007 최종 — role 체크 복원 + mentor 추가)
CREATE POLICY "consultation_notes_insert" ON consultation_notes
  FOR INSERT WITH CHECK (
    instructor_id = auth.uid()
    AND academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'teacher', 'mentor')
  );

-- SELECT (00007 최종 — mentor 조회 확장)
CREATE POLICY "consultation_notes_select" ON consultation_notes
  FOR SELECT USING (
    academy_id = get_my_academy_id()
    AND (instructor_id = auth.uid() OR get_my_role() IN ('owner', 'mentor'))
  );
```

## Connections

- [[rls-profiles]] — upstream: `get_my_academy_id()` / `get_my_role()` 함수 사용 (00006 정의)
- [[api-mentor-consultations]] — downstream: 이 RLS 위에서 동작하는 GET/POST 엔드포인트
- [[role-mentor]] — see-also: mentor role 추가(00007)와 이 정책 확장이 동시에 이루어짐
- [[concept-academy-isolation]] — see-also: academy_id 격리 원칙 적용

## Gotchas

- **00006 회귀 (가장 중요한 Gotcha)**: `consultation_notes_insert` 정책에서 `AND get_my_role() IN ('owner', 'teacher')` 라인이 00006에서 누락. 결과: student도 상담 기록 삽입 가능. E2E 테스트 REG-001b가 이를 검증. 00007에서 수정.
- **mentor SELECT 범위**: mentor는 `instructor_id = auth.uid()`가 아닌 경우도 조회 가능 (`get_my_role() = 'mentor'`). 즉, 다른 멘토가 작성한 기록도 같은 학원이면 보인다. 이것이 의도한 정책인지(학원 공유) 확인 필요.
- **UPDATE/DELETE 정책 없음**: 현재 consultation_notes에는 UPDATE/DELETE RLS 정책이 없다. Supabase RLS에서 정책 없는 operation은 기본 DENY — 수정/삭제 불가.

## Changelog

- 2026-04-11 — 00007: INSERT role 체크 복원 (`mentor` 포함), SELECT mentor 확장 (N-9)
- 2026-04-11 — 00006: INSERT role 체크 실수로 제거 (회귀 — 00007에서 수정)
- 초기 — 00001: 기본 consultation_notes RLS (instructor_id + academy_id)
