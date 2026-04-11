---
type: screen
id: screen-instructor-session-reports
related:
  - "[[api-ai-analysis]]"
  - "[[api-ai-report]]"
  - "[[screen-instructor-session-detail]]"
  - "[[component-delta-chart]]"
sources:
  - "src/app/instructor/sessions/[id]/reports/page.tsx"
updated: 2026-04-11
owner: analyst-2
---

# screen-instructor-session-reports — 세션 리포트

## Summary

`/instructor/sessions/[id]/reports` 라우트. 세션의 분석 이력 조회 + AI 리포트 생성 트리거. `GET /api/ai/analysis?sessionId` 조회 후 이해도 라인차트 + 코칭 제안 표시.

## Key Claims

- `"use client"` — useEffect로 분석 이력 로드.
- `GET /api/ai/analysis?sessionId={id}` 로드: `AnalysisResult[]` 배열.
- "리포트 생성" 버튼: `POST /api/ai/report { sessionId }` 호출 후 분석 재로드.
- `AnalysisResult`: `{ id, analysis_type, understanding_scores, weak_topics, coaching_suggestion, created_at }`.
- `coaching_suggestion`: JSON 문자열 — 화면에서 `JSON.parse()` 필요.
- 이해도 라인차트: `analysis_type="realtime"` 데이터에서 시간순 변화 표시.

## Intuition / Why

강사가 세션 종료 후 전체 이해도 추이를 시간순으로 복기. AI 리포트 생성 버튼으로 수강생별 개인 리포트 일괄 생성.

## Details

`POST /api/ai/report { sessionId }` — studentId 미지정 시 강사용 호출 → API에서 `isStaff && !requestedStudentId` → 400 발생 가능. 화면에서 studentId 없이 호출하는 패턴 확인 필요.

## Connections

- [[api-ai-analysis]] — upstream: GET 분석 이력 조회
- [[api-ai-report]] — upstream: POST 리포트 생성
- [[screen-instructor-session-detail]] — upstream: 세션 상세에서 "리포트" 탭으로 진입
- [[component-delta-chart]] — see-also: 같은 분석 데이터를 DeltaChart에서도 사용

## Gotchas

- **POST /api/ai/report studentId 누락**: API는 강사가 studentId 필수. 화면이 studentId 없이 호출하면 400. 리포트 생성 버튼에 수강생 선택 UI가 없으면 항상 실패.
- **coaching_suggestion JSON.parse**: DB에 JSON.stringify로 저장됨. 화면에서 `JSON.parse(result.coaching_suggestion)` 필요.

## Changelog

- 초기 — 세션 리포트 화면 구현 (분석 이력, AI 리포트 생성)
