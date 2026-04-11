---
type: screen
id: screen-instructor-session-new
related:
  - "[[api-sessions]]"
  - "[[screen-instructor-dashboard]]"
  - "[[screen-instructor-session-detail]]"
  - "[[concept-session]]"
sources:
  - "src/app/instructor/sessions/new/page.tsx"
  - "docs/tc/instructor-session-new.md"
  - "docs/scrum/e2e-results.md#Issue-2"
updated: 2026-04-11
owner: analyst-2
---

# screen-instructor-session-new — 강사 세션 생성

## Summary

`/instructor/sessions/new` 라우트. 세션 제목, 과목, 과정 카테고리, 토픽, 익명 모드를 입력하여 새 세션을 생성. `POST /api/sessions` 성공 후 세션 상세 화면으로 이동.

## Key Claims

- 입력 필드: `id="title"`, `id="subject"` — `name` 속성 없음 (E2E Cycle 1 Issue 2 수정 포인트).
- Zod 검증: `title: z.string().min(1).max(200)`, `subject: z.string().min(1).max(100)`.
- 생성된 세션은 `status = "draft"`, `join_code = null` — POST 응답에 join_code 없음.
- 과정 카테고리: `programming | security | network | data_science | ai_development | ai_software`.
- E2E 테스트 ISN-UI-001, ISN-API-001 PASS.

## Intuition / Why

KIT 과정명에 맞는 카테고리 선택으로 AI 퀴즈 생성 시 과목 맥락이 프롬프트에 전달된다. 토픽 목록이 few-shot 선택을 안내.

## Details

E2E Cycle 1 Issue 2: Playwright 스펙에서 `input[name="title"]` 셀렉터 사용 → 실제 DOM은 `id="title"` (name 속성 없음) → 테스트 실패. `page.fill('#title', ...)`로 수정. `data-testid` 추가 권장.

## Connections

- [[api-sessions]] — upstream: POST /api/sessions 호출
- [[screen-instructor-dashboard]] — upstream: "새 세션" 버튼에서 진입
- [[screen-instructor-session-detail]] — downstream: 생성 완료 후 이동
- [[concept-session]] — see-also: session 상태 전환 (draft → active → ended)

## Gotchas

- **`id` vs `name` 속성**: form 필드에 `id="title"`만 있고 `name` 속성이 없다. Playwright에서 `input[name="title"]`로 찾으면 미탐지 → `#title` 셀렉터 또는 `data-testid` 사용.

## Changelog

- 2026-04-11 — Cycle 1 Issue 2 수정: E2E 스펙 셀렉터 `#title`로 교정
- 초기 — 강사 세션 생성 폼 기본 구현
