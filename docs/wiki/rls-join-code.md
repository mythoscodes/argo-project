---
type: rls
id: rls-join-code
related:
  - "[[rls-sessions]]"
  - "[[api-sessions-id]]"
  - "[[api-sessions]]"
  - "[[concept-join-code]]"
  - "[[screen-instructor-session-detail]]"
sources:
  - "src/app/api/sessions/route.ts"
  - "src/app/api/sessions/[id]/route.ts"
  - "docs/scrum/dev-changelog.md#T7-hotfix"
  - "supabase/migrations/00006_fix_profiles_rls_recursion.sql"
updated: 2026-04-11
owner: analyst-2
---

# rls-join-code — 참여코드 노출 방지 (API + DB 이중 보호)

## Summary

`join_code`는 RLS 단독으로는 필드 단위 숨김이 불가하여 **API 레벨 필터**가 추가로 필요하다. draft 세션에는 null, active 전환 시 발급, student/mentor API 응답에서 제거하는 3겹 방어.

## Key Claims

- `sessions` 테이블 RLS는 row 전체를 반환 — `join_code` 필드만 숨기는 column-level RLS 없음.
- `GET /api/sessions` (student 경로): `select("id, title, subject, ...")` — join_code 필드 없는 필드 목록 사용.
- `GET /api/sessions/[id]` (non-teacher): `Object.entries(session).filter(([key]) => key !== "join_code")`.
- draft 세션 `join_code = null` — PATCH→active 전환 시 최초 발급 (T7-hotfix).
- E2E 테스트 REG-004 (draft 세션 join_code DOM 미노출) + ISD-ERR-001 (active 전환 전 미노출) 자동 검증.

## Intuition / Why

수강생이 draft 세션의 참여코드를 미리 알면 강사가 의도한 수업 시작 전에 세션에 입장할 수 있다. 또한 타 수강생이 참여코드를 알면 다른 학원의 세션에 무단 입장 가능. 이중 방어: DB null(draft) + API 필터(non-teacher).

`join_code`는 6자리 영숫자 — 브루트포스 가능성: `32^6 = 약 10억`. 짧은 시간에 전수 검사는 어렵지만, rate limit 없으면 이론상 가능. 현재 `/api/sessions/join` rate limit 미구현.

## Details

```ts
// GET /api/sessions — student용 select
.select("id, title, subject, course_category, status, created_at, started_at, ended_at, session_participants(count)")
// join_code 필드 완전 제외

// GET /api/sessions/[id] — non-teacher
const filteredSession = Object.entries(session)
  .filter(([key]) => key !== "join_code")
  .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {});
```

## Connections

- [[rls-sessions]] — upstream: sessions SELECT RLS가 row 전체 반환 — join_code 포함
- [[api-sessions-id]] — implements: Object.entries 필터 구현
- [[api-sessions]] — implements: 필드 목록 select로 join_code 제외
- [[concept-join-code]] — see-also: 참여코드 생성/발급 전반 개념

## Gotchas

- **필드 목록 SELECT 취약점**: `select("id, title, ...")` 방식은 새 컬럼 추가 시 자동으로 포함되지 않는다. 반면 `select("*")`에서 필터링하는 방식은 새 컬럼이 자동 포함될 위험. 두 방식 혼용 — 코드 리뷰 시 확인 필요.
- **Playwright DOM 검사**: REG-004 E2E 테스트가 draft 세션의 DOM에 join_code 텍스트 없음을 검증. UI 컴포넌트가 `{session.join_code}`를 조건 없이 렌더하면 `null` 텍스트 노출.
- **커밋 236a658**: join_code 노출 방지 관련 수정 커밋. 회귀 발생 시 이 커밋 diff 참조.

## Changelog

- 2026-04-11 — T7-hotfix: draft join_code = null, PATCH→active 발급 (ISD-ERR-001 대응)
- 커밋 236a658 — API 레벨 join_code 필터 추가 (REG-004 대응)
