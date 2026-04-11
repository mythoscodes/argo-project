---
type: api
id: api-dashboard
related:
  - "[[lib-constants]]"
  - "[[rls-sessions]]"
  - "[[concept-risk-signal]]"
  - "[[concept-academy-isolation]]"
sources:
  - "src/app/api/dashboard/route.ts"
updated: 2026-04-11
owner: analyst-2
---

# api-dashboard — GET /api/dashboard

## Summary

원장(owner) 전용 학원 전체 통계 대시보드 API. 세션 목록·참여자·응답·퀴즈를 한 번에 조회해 sessionStats, atRiskStudents, summary를 반환.

## Key Claims

- 인가: `role === "owner"` 전용 — teacher/mentor 403.
- `academy_id` 기반으로 모든 세션·응답·참여자 조회 (학원 격리).
- `atRiskStudents`: `avgScore < WEAK_TOPIC_THRESHOLD(60) || responseRate < RESPONSE_RATE_THRESHOLD`.
- 중복 제거: `studentId::sessionTitle` 키로 Map dedup.
- `summary`: totalSessions, activeSessions, totalStudents (unique), academyAvgUnderstanding.
- 세션 없을 시 빈 DashboardData 반환 (에러 아님).
- profiles JOIN: `sessions.select("..., profiles(display_name)")` — Relationships 미정의로 unknown 캐스팅 + 타입 가드.

## Intuition / Why

원장이 학원 전체를 한눈에 파악. 이탈 위험 수강생을 조기 발견해 멘토에게 배정하거나 직접 개입. RESPONSE_RATE_THRESHOLD로 참여율 낮은 수강생도 위험으로 분류.

## Details

5개 별도 쿼리 (sessions, responses, quizzes, participants, studentProfiles) 후 서버사이드 집계. Supabase join 관계가 database.ts에 미정의되어 `unknown[]` + 타입 가드 함수(isSessionRow, isResponseRow 등) 적용.

## Connections

- [[lib-constants]] — upstream: WEAK_TOPIC_THRESHOLD, RESPONSE_RATE_THRESHOLD
- [[rls-sessions]] — upstream: sessions SELECT (academy_id 기반)
- [[concept-risk-signal]] — see-also: 위험 신호 개념 (dashboard는 단순화된 버전)
- [[concept-academy-isolation]] — implements: academy_id로 학원 전체 데이터 격리

## Gotchas

- **RESPONSE_RATE_THRESHOLD**: lib-constants.md에 정의. WEAK_TOPIC_THRESHOLD(60)와 별개 상수.
- **타입 가드 5종**: isSessionRow, isResponseRow, isQuizRow, isParticipantRow, isProfileRow — profiles JOIN 결과가 알 수 없는 구조라 별도 가드 필요. 모델 변경 시 가드도 업데이트 필요.
- **응답 없는 세션**: `avgUnderstanding = 0` (응답 데이터 없는 세션). 필터링 시 `scoresWithData.filter(s => s.avgUnderstanding > 0)`으로 0 제외.

## Changelog

- 초기 — GET /api/dashboard 구현 (owner 전용, 5쿼리 집계, 타입 가드)
