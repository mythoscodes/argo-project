---
type: api
id: api-sessions-id
related:
  - "[[api-sessions]]"
  - "[[rls-sessions]]"
  - "[[concept-join-code]]"
  - "[[concept-session]]"
  - "[[screen-instructor-session-detail]]"
sources:
  - "src/app/api/sessions/[id]/route.ts"
  - "docs/scrum/dev-changelog.md#T7-hotfix"
  - "docs/tc/instructor-session-detail.md"
updated: 2026-04-11
owner: analyst-2
---

# api-sessions-id — GET/PATCH/DELETE /api/sessions/[id]

## Summary

단일 세션 조회(GET), 상태 전환(PATCH), 삭제(DELETE)를 처리하는 Route Handler. PATCH에서 `status → active` 전환 시 `join_code`를 최초 발급한다.

## Key Claims

- `PATCH status → active`: `generateJoinCode()` 호출 → `join_code` 필드 갱신. draft 이외 상태에서의 전환 정책 확인 필요.
- GET: teacher/owner는 `select("*")` (join_code 포함). student/mentor는 join_code 필드 제외 필드 목록 사용.
- `Object.entries(session).filter(([key]) => key !== "join_code")` — non-teacher에게 join_code 제거하는 API 레벨 필터 (커밋 `236a658`).
- DELETE: RLS `sessions_update_own` — teacher_id = auth.uid() 본인 세션만 삭제 가능.
- `generateJoinCode()`: `SESSION_CODE_LENGTH = 6`자리, charset `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (혼동 문자 제외).

## Intuition / Why

`join_code` 지연 발급은 E2E 스펙 요구사항(draft = null). PATCH 시점에 발급하면 draft 세션에 코드가 없고, active 전환 순간 코드가 생겨 강사에게 표시된다.

`join_code` API 레벨 필터는 RLS가 특정 필드를 숨기지 못하는 한계를 보완. student가 `GET /api/sessions/[id]`를 호출하면 `join_code` 없는 객체를 받는다.

## Details

```ts
// PATCH 핵심 — join_code 발급
if (body.status === "active" && currentSession.status === "draft") {
  updates.join_code = generateJoinCode(); // SESSION_CODE_LENGTH자리 영숫자
}

// GET — non-teacher 응답에서 join_code 제거
const filteredSession = Object.entries(session)
  .filter(([key]) => key !== "join_code")
  .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {});
```

## Connections

- [[api-sessions]] — sibling: 세션 목록 GET + 신규 세션 POST
- [[rls-sessions]] — upstream: UPDATE 정책 `teacher_id = auth.uid()`
- [[concept-join-code]] — see-also: 참여코드 생성 정책, 보안 요구사항
- [[screen-instructor-session-detail]] — downstream: PATCH 호출하는 UI

## Gotchas

- **T7-hotfix**: 원래 `POST /api/sessions`에서 join_code를 draft 생성 시 발급했다. E2E 테스트 실패 후 `generateJoinCode()`를 이 파일로 이동, draft → null, PATCH → active 시 발급.
- **student의 GET 필터**: `Object.entries` 필터가 없으면 student가 `join_code`를 볼 수 있다 (REG-004 회귀). 필터 로직 수정 시 반드시 `join_code`가 빠지는지 확인.

## Changelog

- 2026-04-11 — T7-hotfix: `generateJoinCode()` 이동, PATCH→active 시 발급, GET non-teacher join_code 필터
- 초기 — GET/PATCH/DELETE 기본 구현
