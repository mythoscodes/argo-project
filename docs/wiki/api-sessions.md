---
type: api
id: api-sessions
related:
  - "[[api-sessions-id]]"
  - "[[rls-sessions]]"
  - "[[lib-supabase-server]]"
  - "[[concept-session]]"
  - "[[screen-instructor-session-new]]"
  - "[[screen-instructor-dashboard]]"
sources:
  - "src/app/api/sessions/route.ts"
  - "docs/tc/instructor-session-new.md"
  - "CLAUDE.md#API-Route-규칙"
updated: 2026-04-11
owner: analyst-2
---

# api-sessions — GET/POST /api/sessions

## Summary

세션 목록 조회(GET)와 신규 세션 생성(POST)을 처리하는 Route Handler. teacher/owner만 세션을 생성할 수 있으며, 수강생에게는 `join_code` 필드를 제거한 응답을 반환한다.

## Key Claims

- GET: teacher/owner는 `teacher_id = user.id` 기반 본인 세션만 조회 (`join_code` 포함). student/mentor는 `session_participants`를 통해 참여 세션 조회 (`join_code` 제외).
- POST: Zod 스키마 `createSessionSchema` 검증 후 INSERT. `join_code`는 생성 시 null — `PATCH /api/sessions/[id]`로 `status → active` 전환 시 발급 (T7-hotfix).
- POST 인가: `profile.role`이 `'owner'` 또는 `'teacher'`인 경우만 허용. mentor/student는 `403`.
- `courseCategory`: `programming | security | network | data_science | ai_development | ai_software` 6가지 enum — Zod 검증.

## Intuition / Why

수강생이 세션 목록 API를 호출할 때 `join_code`가 노출되면 안 된다 (ISD-ERR-001 회귀). student role의 경우 API 레벨에서 `join_code`를 제거한 별도 필드 목록으로 SELECT한다. RLS만으로는 특정 필드를 숨길 수 없어 API에서 처리.

`join_code` 지연 발급(draft → null, active 전환 시 생성)은 E2E 스펙 요구사항 — draft 세션에 join_code가 있으면 스펙 위반.

## Details

```ts
// POST 핵심 — join_code 없이 INSERT
const { data } = await supabase.from("sessions").insert({
  teacher_id: user.id,
  academy_id: profile.academy_id,
  title, subject, course_category, topics, anonymous_mode,
  // join_code: null (명시 불필요 — DB 기본값)
}).select().single();
// → 201 반환
```

GET에서 student용 SELECT: `"id, title, subject, course_category, status, created_at, ..."` — `join_code` 필드 없음.

## Connections

- [[api-sessions-id]] — sibling: 단일 세션 조회/수정/삭제. join_code 발급(PATCH)이 여기에
- [[rls-sessions]] — upstream: INSERT 시 teacher/owner role 체크 + academy_id 격리
- [[lib-supabase-server]] — upstream: `createClient()` 사용
- [[concept-session]] — see-also: 세션 개념 상세 (draft/active/ended 상태 전환)
- [[screen-instructor-session-new]] — downstream: 이 POST를 호출하는 UI

## Gotchas

- **join_code 사전 생성 금지**: 원래 POST 시 `generateJoinCode()`를 호출하여 `join_code`를 draft 세션에 함께 저장했다. E2E 스펙(SSN-UI-004)이 "draft = null" 요구 → T7-hotfix에서 제거. 다시 추가하면 스펙 실패.
- **status 파라미터 필터**: GET에 `?status=active` 쿼리 파라미터로 상태 필터링 가능. 파라미터 없으면 전체 반환.
- **mentor GET**: mentor는 `session_participants` 경유로 학원 전체 세션에 접근 (teacher처럼 `select("*")` 아님). `/api/mentor/students`에서는 `academy_id` 기반으로 별도 처리.

## Changelog

- 2026-04-11 — T7-hotfix: POST에서 join_code 사전 생성 제거 (`join_code = null` draft 생성)
- 초기 — GET/POST 기본 구현
