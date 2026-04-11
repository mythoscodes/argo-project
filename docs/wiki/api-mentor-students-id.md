---
type: api
id: api-mentor-students-id
related:
  - "[[api-mentor-students]]"
  - "[[api-mentor-consultations]]"
  - "[[lib-constants]]"
  - "[[screen-mentor-student-detail]]"
  - "[[concept-risk-signal]]"
sources:
  - "src/app/api/mentor/students/[id]/route.ts"
updated: 2026-04-11
owner: analyst-2
---

# api-mentor-students-id — GET /api/mentor/students/[id]

## Summary

특정 수강생의 상세 정보를 반환. 3-signal 위험 계산, 세션별 정답률 이력, 토픽별 이해도, 상담 기록을 한 번에 응답. snake_case flat 구조.

## Key Claims

- 인가: `role IN ('owner', 'teacher', 'mentor')`.
- `studentProfile.academy_id !== profile.academy_id` → 403 (타 학원 수강생 차단).
- mentor: `sessionQuery.eq("academy_id", ...)` — 학원 전체 세션 기준. teacher/owner: `eq("teacher_id", user.id)`.
- 3-signal 계산: accuracy(최근 RISK_ACCURACY_SESSION_COUNT 세션), speed(최근 3 avgResponseTimeMs), absence(연속 미참여).
- `riskLevel`: `HIGH` (신호 ≥ RISK_SIGNAL_COUNT_FOR_HIGH=2) / `MEDIUM` (1) / `LOW` (0).
- 상담 기록: `consultation_notes WHERE instructor_id = user.id` — 본인이 작성한 것만.
- 응답 형식: snake_case (C-8 프론트 인터페이스 일치).

## Intuition / Why

멘토/강사가 수강생 상세 화면에서 한 번의 API 호출로 모든 정보를 받음. N+1 방지를 위해 sessionIds 배열로 한 번에 조회. N-8: mentor는 teacher_id 기반이 아닌 academy_id 기반으로 학원 전체 세션 열람.

## Details

```ts
// 응답 속도 추세 (최근 3세션)
nonZeroSpeeds[0] > nonZeroSpeeds[nonZeroSpeeds.length - 1] * RISK_SPEED_INCREASE_RATIO
// = 가장 최근 속도가 가장 이전 속도의 1.3배 초과
```

연속 미참여: mySessions 배열 앞에서부터 participatedSessionIds에 없는 세션 count, 참여 세션 만나면 중단.

## Connections

- [[api-mentor-students]] — sibling: 목록 API (risk_level 요약), 상세 API (full data)
- [[api-mentor-consultations]] — sibling: 상담 기록 CRUD (별도 엔드포인트)
- [[lib-constants]] — upstream: 6개 RISK_* 상수 + WEAK_TOPIC_THRESHOLD
- [[screen-mentor-student-detail]] — downstream: 수강생 상세 화면 병렬 호출
- [[concept-risk-signal]] — implements: 3-signal 이탈 위험 알고리즘

## Gotchas

- **상담 기록 본인만**: `instructor_id = user.id` — 다른 멘토의 상담 기록은 보이지 않음. 공유 필요 시 정책 변경 필요.
- **speed 판별 방향**: `speeds[0]`가 가장 최근 (최신순 정렬). `speeds[0] > speeds[-1] * 1.3` = 최근이 과거보다 1.3배 느림 = 속도 증가(악화) 신호.
- **weak_topics vs topicScores**: 응답 `weak_topics`는 `score < WEAK_TOPIC_THRESHOLD (60)`, 반면 `topicScores`는 `score < 100`인 것도 포함. 기준 다름.

## Changelog

- 초기 — GET /api/mentor/students/[id] 구현 (N-8: mentor academy_id 기반, C-8: snake_case)
