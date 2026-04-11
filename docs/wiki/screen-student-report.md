---
type: screen
id: screen-student-report
related:
  - "[[api-ai-report]]"
  - "[[screen-student-result]]"
  - "[[lib-ai-schemas]]"
  - "[[feature-f7-report]]"
sources:
  - "src/app/student/sessions/[id]/report/page.tsx"
  - "docs/tc/student-report.md"
updated: 2026-04-11
owner: analyst-2
---

# screen-student-report — 수강생 학습 리포트

## Summary

`/student/sessions/[id]/report` 라우트. AI가 개인 응답을 분석한 개념별 이해도 레이더 차트 + 취약 개념 배지 + 학습 추천 텍스트를 제공. 최초 방문 시 CTA 버튼으로 AI 리포트를 온디맨드 생성.

## Key Claims

- `GET /api/ai/report?sessionId` → null이면 "아직 리포트가 생성되지 않았습니다" + 생성 버튼 CTA.
- `POST /api/ai/report` 실패 시 에러 토스트 미구현 (silent failure) — 로딩 해제만.
- RadarChart: `understanding_summary` 토픽 1~2개 시 최소 폴리곤 미형성 가능성 — fallback 확인 필요.
- `weak_topics = []` 시 취약 개념 카드 미노출.
- AI 응답 Zod 검증 실패 시 1회 재시도 (`AI_MAX_RETRY_COUNT = 1`).
- 더블클릭 방지: "AI 리포트 생성" 버튼 첫 클릭 후 disabled.

## Intuition / Why

F7 학습 리포트 수강생 뷰. 즉각 결과(result 화면)와 달리 AI가 개념 단위로 이해도를 분석하여 취약점을 식별한다. KIT 성인 수강생이 다음 공부 방향을 잡는 데 활용.

## Details

리포트는 캐시 없이 항상 최신 응답 기반 생성. `POST` 중복 시 덮어쓰기 또는 새 레코드 — 정책 확인 필요 (SSP-API-006).

**TC 파일**: `[[docs/tc/student-report.md]]` — 74개 TC (SSP-UI-001~010, SSP-API-001~006, SSP-ERR-001~006, SSP-BND-001~010, SSP-AUTH-001~006, SSP-NET-001~005, SSP-AI-001~005, SSP-A11Y-001~005, SSP-KO-001~004, SSP-RLS-001~005, SSP-SEC-001~004, SSP-RL-001~003, SSP-NAV-001~005)

## Connections

- [[api-ai-report]] — upstream: GET(기존 리포트 조회) + POST(AI 생성)
- [[screen-student-result]] — upstream: "결과로 돌아가기" 버튼으로 복귀
- [[lib-ai-schemas]] — upstream: AI 응답 Zod 검증 스키마
- [[feature-f7-report]] — implements: F7 리포트 수강생 뷰

## Gotchas

- **RadarChart 최소 토픽**: understanding_summary가 1~2개 토픽이면 Recharts RadarChart가 polygon을 못 그리거나 이상하게 렌더할 수 있다. 3개 미만 시 레이더 숨김 처리 권장.
- **AI 생성 실패 silent**: POST 실패 시 에러 메시지 없이 로딩 해제만. 수강생이 오류 원인을 모름. 에러 토스트 추가 필요.
- **본인 리포트만**: RLS로 타 수강생 리포트 조회 차단. 하지만 POST 시 타 학원 studentId 주입 여부도 검증 필요 (SSP-RLS-002).

## Changelog

- 2026-04-11 — 초판 작성 (analyst-2)
- 초기 — 수강생 학습 리포트 기본 구현
