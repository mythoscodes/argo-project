---
type: screen
id: screen-instructor-session-detail
related:
  - "[[api-sessions-id]]"
  - "[[hook-use-realtime]]"
  - "[[api-ai-quiz]]"
  - "[[api-ai-analysis]]"
  - "[[api-ai-coaching]]"
  - "[[concept-join-code]]"
  - "[[feature-f4-heatmap]]"
sources:
  - "src/app/instructor/sessions/[id]/page.tsx"
  - "docs/tc/instructor-session-detail.md"
updated: 2026-04-11
owner: analyst-2
---

# screen-instructor-session-detail — 강사 세션 상세 (진행 화면)

## Summary

`/instructor/sessions/[id]` 라우트. 강사가 세션을 active로 전환하고 참여코드를 공유하며 퀴즈를 생성·배포하는 중심 화면. 실시간 히트맵과 AI 코칭 제안이 포함된다.

## Key Claims

- draft → active 전환: `PATCH /api/sessions/[id]` → `status = "active"`, 이 시점에 `join_code` 발급 (T7-hotfix).
- active 전환 후 참여코드가 UI에 노출된다 (ISD-UI-004). draft 상태에서는 DOM에 join_code 없음 (ISD-ERR-001).
- 퀴즈 생성: `POST /api/ai/quiz` — 생성 후 `POST /api/quizzes`로 저장 → Realtime으로 수강생 화면에 push.
- 이해도 히트맵: `useRealtimeResponses`로 응답 스트리밍 수신 → 토픽별 정답률 집계 렌더.
- AI 코칭 제안: 히트맵 기반 `POST /api/ai/analysis` 또는 `POST /api/ai/coaching` 호출.

## Intuition / Why

F1(세션관리) + F2(퀴즈생성) + F4(히트맵) + F5(코칭)가 하나의 화면에 통합. 강사가 수업 중 탭 전환 없이 퀴즈 출제, 응답 모니터링, AI 코칭 확인을 모두 처리.

## Details

`join_code` 노출 정책: draft 상태 DOM에 join_code 값 없어야 함 (REG-004 E2E 테스트로 검증). active 전환 후 참여코드 박스에 6자리 코드 표시.

**TC 파일**: `[[docs/tc/instructor-session-detail.md]]`

## Connections

- [[api-sessions-id]] — upstream: GET(세션 조회) + PATCH(상태 전환, join_code 발급)
- [[hook-use-realtime]] — uses: 응답 실시간 스트리밍
- [[api-ai-quiz]] — upstream: 퀴즈 AI 생성
- [[concept-join-code]] — see-also: 참여코드 생성 정책
- [[feature-f4-heatmap]] — implements: 이 화면이 히트맵 기능의 주 표시 위치

## Gotchas

- **draft 시 join_code DOM 노출 금지**: 조건부 렌더링 없이 `session.join_code`를 항상 렌더하면 draft 시 null이 텍스트로 표시되거나, DB에 join_code가 있던 구버전에서는 노출. ISD-ERR-001 E2E 테스트가 DOM 검사.
- **join_code 지연 발급**: T7-hotfix 이전엔 POST 시 발급 → draft에도 join_code 있었음. 현재는 PATCH→active 시만 발급.

## Changelog

- 2026-04-11 — T7-hotfix: join_code 지연 발급 반영 (draft = null)
- 초기 — 강사 세션 상세 기본 구현
