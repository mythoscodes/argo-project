---
type: screen
id: screen-owner-dashboard
related:
  - "[[api-dashboard]]"
  - "[[concept-academy-isolation]]"
  - "[[concept-risk-signal]]"
sources:
  - "src/app/owner/page.tsx"
updated: 2026-04-11
owner: analyst-2
---

# screen-owner-dashboard — 원장 대시보드

## Summary

`/owner` 라우트. 원장(owner) 전용 학원 전체 통계 대시보드. `GET /api/dashboard`로 sessionStats, atRiskStudents, summary를 조회해 BarChart + LineChart + 위험 수강생 목록으로 표시.

## Key Claims

- `"use client"` — useEffect로 fetch.
- `GET /api/dashboard` 단일 호출 — 모든 집계 서버에서 처리.
- summary 카드: totalSessions, activeSessions, totalStudents, academyAvgUnderstanding.
- atRiskStudents: `avgScore < 60 || responseRate < RESPONSE_RATE_THRESHOLD` — 위험 수강생 목록.
- sessionStats: 세션별 avgUnderstanding BarChart + 참여자 수.
- `"use client"` 이므로 role guard는 서버 레이아웃(`owner/layout.tsx`)에서 처리.

## Intuition / Why

F8 원장 대시보드 (P2 보너스 기능). 원장이 매일 아침 학원 전체 현황을 파악. RESPONSE_RATE_THRESHOLD 미달 수강생도 이탈 위험으로 분류해 멘토 배정 판단.

## Details

`DashboardData` 인터페이스는 API 응답과 다른 snake_case 구조를 정의 (`total_sessions`, `at_risk_list` 등). API 응답 키 변환이 필요하거나 인터페이스가 API와 불일치할 수 있음.

## Connections

- [[api-dashboard]] — upstream: GET /api/dashboard
- [[concept-academy-isolation]] — see-also: academy_id 기반 학원 전체 격리
- [[concept-risk-signal]] — see-also: 위험 수강생 분류 기준

## Gotchas

- **인터페이스 불일치**: 페이지의 `DashboardData` 타입(`at_risk_list`, `total_sessions`)과 API 응답(`atRiskStudents`, `totalSessions`)의 키 명명 불일치 가능 — 실제 동작 확인 필요.
- **owner layout guard**: `/owner/layout.tsx`에서 role=owner 체크 가정. 없으면 teacher도 접근 가능.

## Changelog

- 초기 — 원장 대시보드 기본 구현 (F8, P2 보너스)
