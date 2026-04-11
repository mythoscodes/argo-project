---
type: api
id: api-sessions-join
related:
  - "[[rls-sessions]]"
  - "[[concept-join-code]]"
  - "[[screen-student-join]]"
  - "[[api-sessions-id]]"
sources:
  - "src/app/api/sessions/join/route.ts"
updated: 2026-04-11
owner: analyst-2
---

# api-sessions-join — POST /api/sessions/join

## Summary

수강생이 6자리 join_code를 입력해 active 세션에 참여하는 엔드포인트. `session_participants` UPSERT로 중복 참여를 멱등하게 처리.

## Key Claims

- 입력 Zod: `{ joinCode: z.string().length(6) }` — 정확히 6자만 허용.
- 역할 체크: `profile.role !== "student"` → 403. 강사/멘토는 참여 불가.
- join_code 조회: `.eq("join_code", joinCode.toUpperCase())` — 대소문자 무관.
- `session.status !== "active"` → 400 (draft/ended 세션 참여 불가).
- UPSERT: `onConflict: "session_id,student_id"` — 재참여 시 기존 레코드 갱신(멱등).
- 응답: `{ sessionId, sessionTitle, participant }`.

## Intuition / Why

수강생이 강사가 칠판에 적어준 코드를 입력하는 UX. 대소문자 구분 없이 처리하여 오타 위험 감소. UPSERT로 새로고침/재시도 시 중복 참여자 레코드 생성 방지.

## Details

`joinCode.toUpperCase()` 변환 후 DB 조회 — SESSION_CODE_LENGTH=6, 문자셋은 O/I/1/0 제외 영대문자+숫자. join_code는 active 전환 시에만 발급되므로 draft 세션은 DB에서 매칭되지 않아 404 또는 400으로 처리.

## Connections

- [[rls-sessions]] — upstream: sessions SELECT RLS (academy_id 격리)
- [[concept-join-code]] — see-also: 참여코드 생성·발급 전반
- [[screen-student-join]] — downstream: UI에서 이 API 호출
- [[api-sessions-id]] — upstream: PATCH→active 시 join_code 발급

## Gotchas

- **draft 세션 동작**: draft 세션은 join_code=null → `.eq("join_code", ...)` 조회 불일치 → 404 응답. 400이 아님.
- **ended 세션**: join_code가 있더라도 `status !== "active"` 체크가 별도로 있어 400.
- **role 체크 순서**: role 체크가 session 조회보다 먼저 → 403이 404보다 먼저 반환.

## Changelog

- 초기 — POST /api/sessions/join 구현 (UPSERT, toUpperCase, role 체크)
