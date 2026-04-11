---
type: concept
id: concept-join-code
related:
  - "[[concept-session]]"
  - "[[concept-academy-isolation]]"
  - "[[feature-f1-session]]"
  - "[[role-student]]"
  - "[[role-teacher]]"
sources:
  - "supabase/migrations/00001_initial_schema.sql#sessions"
  - "src/app/api/sessions/[id]/route.ts#generateJoinCode"
  - "src/app/api/sessions/join/route.ts"
  - "src/lib/constants.ts#SESSION_CODE_LENGTH"
  - "docs/tc/instructor-session-new.md#ISN-API-005"
  - "docs/tc/instructor-session-detail.md#ISD-ERR-001"
updated: 2026-04-11
owner: planner
---

# Join Code (참여 코드)

## Summary

수강생이 active 세션에 입장하기 위해 강사에게서 받는 6자리 영숫자 코드. 세션이 `draft` 상태일 때는 `NULL`이며, `PATCH /api/sessions/[id]` 로 `status='active'`로 전환될 때 서버가 최초 생성한다. 혼동하기 쉬운 문자(O, I, 1, 0)를 문자셋에서 제거해 수기 입력 오류를 방지한다.

## Key Claims

- `join_code`는 세션이 `draft`일 때 `NULL`이다; `PATCH status='active'` 시점에 서버가 `generateJoinCode()`를 호출해 최초 발급한다 — `src/app/api/sessions/[id]/route.ts` L151-154
- `generateJoinCode()`의 문자셋은 `"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"` 32자이며, O·I·1·0을 제외한 대문자+숫자다 — `[id]/route.ts` L8
- `SESSION_CODE_LENGTH = 6` 상수로 코드 길이가 고정되어 있다 — `src/lib/constants.ts` L13
- `POST /api/sessions/join`은 `student` role만 허용한다; teacher/mentor/owner는 403을 받는다 — `src/app/api/sessions/join/route.ts` L48
- `POST /api/sessions/join`은 `joinCode.toUpperCase()`로 대소문자를 정규화한 뒤 DB 조회한다 — `join/route.ts` L58
- `session_participants` upsert는 `onConflict: "session_id,student_id"`로 중복 참여를 멱등 처리한다 — `join/route.ts` L78-80
- `GET /api/sessions` 응답에서 수강생은 `join_code` 필드가 제거된 세션 목록을 받는다 — `src/app/api/sessions/route.ts` L66

## Intuition / Why

join_code가 draft 시 NULL인 이유: 코드를 미리 발급하면 수업 시작 전 수강생이 입장하거나, 코드가 SNS 등 외부에 유출되어 강사가 수강생 입장 시점을 통제할 수 없게 된다. 강사가 "수업 시작" 버튼을 누르는 순간 코드가 생성되므로 입장 제어권이 강사에게 있다.

O·I·1·0 제외의 이유: 수강생이 강사에게서 받아 적는 6자리 코드는 수기 입력된다. 영문자 `O`와 숫자 `0`, 영문자 `I`와 숫자 `1`은 폰트에 따라 구별이 매우 어렵다. 혼동 가능한 4개 문자를 제외해 "6자리 코드를 잘못 읽어서 입장 못함" 상황을 방지한다.

대소문자 정규화: 수강생이 소문자로 입력해도 `toUpperCase()`로 정규화하여 입장 실패를 방지한다.

## Details

### generateJoinCode() 구현

```typescript
// src/app/api/sessions/[id]/route.ts L7-14
function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32자, O/I/1/0 제외
  let code = "";
  for (let i = 0; i < SESSION_CODE_LENGTH; i++) {  // SESSION_CODE_LENGTH = 6
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

경우의 수: 32^6 = 1,073,741,824 (약 10억) → 충돌 확률 무시 가능한 수준

### 세션 참여 흐름

```
수강생이 join_code 입력
  → POST /api/sessions/join { joinCode: "ABC123" }
  → joinCode.toUpperCase() → "ABC123"
  → sessions WHERE join_code = "ABC123" AND status = "active"
  → session 없음 → 404 (잘못된 코드)
  → session.status !== "active" → 400 (진행 중 아님)
  → session_participants UPSERT (session_id, student_id)
  → 201: { sessionId, sessionTitle, participant }
```

### join_code 노출 정책

| 엔드포인트 | teacher/owner | mentor | student |
|-----------|---------------|--------|---------|
| `GET /api/sessions` 목록 | 포함 | - (미확인) | **제외** |
| `GET /api/sessions/[id]` 단건 | 포함 | 포함 | **제외** |
| `POST /api/sessions` 생성 응답 | NULL(draft) | — | — |
| `PATCH /api/sessions/[id]` active 전환 | **포함(신규 발급)** | — | — |

## Connections

- [[concept-session]] — upstream: join_code는 세션의 draft→active 전환 시 생성되는 세션 하위 개념
- [[concept-academy-isolation]] — see-also: join_code는 URL이 아닌 코드 입력 방식으로 학원 외부 유입을 1차 차단
- [[feature-f1-session]] — implements: F1이 join_code 생성·발급·참여 end-to-end 구현
- [[role-student]] — downstream: 수강생이 join_code를 사용해 active 세션에 참여하는 주체
- [[role-teacher]] — upstream: 강사가 active 전환 시 join_code를 확인하고 수강생에게 공유

## Gotchas

- **draft 시 join_code 노출 회귀 (T7-hotfix)**: QA 3차 사이클(커밋 `236a658`)에서 `POST /api/sessions` 응답에 `join_code` 필드가 포함된 채 반환됐다. draft 생성 시 join_code가 NULL이어야 하는데 초기 구현에서 응답 필터링 없이 전체 row를 반환했다. T7-hotfix에서 draft 응답에서 join_code 제거 처리. `ISN-API-005`, `ISD-ERR-001` TC로 자동화 고정.
- **`Math.random()` 보안 등급**: `generateJoinCode()`가 `Math.random()`을 사용하는데, 이는 암호학적으로 안전한 난수가 아니다. 세션 코드는 공개 채팅방 코드 수준으로 예측 불가능성이 요구되지 않으므로 현재 용도에서는 허용 가능하다. 그러나 보안 심사 시 `crypto.getRandomValues()` 전환 요구가 있을 수 있다.
- **join_code 재사용 위험**: 세션이 `completed`로 전환된 후에도 `join_code`가 DB에 남아 있다. 이론적으로 누군가 completed 세션의 join_code를 알고 있다면 실제 동작하지 않지만 조회 가능한 상태다. `completed` 전환 시 join_code를 NULL로 초기화하는 정책이 없다 — `[id]/route.ts` L156 참고.
- **Zod 검증 길이 하드코딩**: `join/route.ts` L6에서 `z.string().length(6)`이 하드코딩됐다. `SESSION_CODE_LENGTH` 상수를 참조하지 않아, 상수 변경 시 Zod 검증이 따라가지 않는다.

## Changelog

- 2026-04-11 — 초판 작성 (planner)
