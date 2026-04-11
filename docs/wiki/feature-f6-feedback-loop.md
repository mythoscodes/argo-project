---
type: feature
id: feature-f6-feedback-loop
related:
  - "[[concept-quiz]]"
  - "[[concept-understanding-score]]"
  - "[[concept-heatmap]]"
  - "[[feature-f2-quiz-generation]]"
  - "[[feature-f4-heatmap]]"
  - "[[feature-f5-ai-coaching]]"
  - "[[role-teacher]]"
sources:
  - "src/app/api/ai/quiz/route.ts"
  - "src/app/api/ai/analysis/route.ts"
  - "docs/tc/instructor-session-detail.md#1-5 Feedback Loop"
updated: 2026-04-11
owner: planner
---

# F6: Feedback Loop (피드백 루프 / 재퀴즈)

## Summary

1회차 퀴즈 → 응답 수집 → 이해도 분석 → AI 코칭 → 2회차 퀴즈(재퀴즈)의 순환 루프. 기술적으로 새 API가 아닌 F2(AI 퀴즈 생성)의 `round_number` 자동 증분으로 구현된다. 회차별 이해도 변화가 `delta`로 계산된다.

## Key Claims

- 재퀴즈는 새 API 엔드포인트가 없다; 동일한 `POST /api/ai/quiz`를 재호출하면 서버가 `MAX(round_number)+1`로 round_number를 자동 증분한다 — `src/app/api/ai/quiz/route.ts` L139-146
- `GET /api/ai/analysis`(round 미지정)는 모든 회차의 이해도 점수 배열과 `delta`(첫 라운드 vs 마지막 라운드)를 반환한다 — `src/app/api/ai/analysis/route.ts` L266-281
- `delta`가 양수이면 코칭 후 개선, 음수이면 이해도 저하를 의미한다

## Intuition / Why

단순히 퀴즈를 한 번 풀고 끝나는 것이 아니라, 틀린 부분을 재설명하고 다시 확인하는 반복이 진정한 학습 효과를 만든다. Argos의 핵심 가치 제안이다. round_number로 회차를 추적함으로써 "코칭 전후 이해도 변화"를 delta로 정량화한다.

## Details

### 피드백 루프 사이클

```
Round 1:
  1. POST /api/ai/quiz (round_number=1 자동)
  2. 수강생 응답 수집 (F3)
  3. POST /api/ai/analysis → understanding_scores Round 1
  4. 히트맵 확인 → 빨간 토픽 발견 (F4)
  5. POST /api/ai/coaching → 재설명 가이드 (F5)

Round 2 (재퀴즈):
  6. POST /api/ai/quiz (동일 sessionId, 동일 토픽) → round_number=2 자동
  7. 수강생 응답 수집
  8. GET /api/ai/analysis → rounds:[R1,R2], delta:{topic: +46}
  9. 리포트/히트맵에서 개선 확인 (F7)
```

## Connections

- [[concept-quiz]] — upstream: round_number가 피드백 루프 회차 구분의 기술적 기반
- [[concept-understanding-score]] — downstream: delta 계산이 피드백 루프 효과의 정량 지표
- [[concept-heatmap]] — see-also: round별 히트맵이 코칭 전후 비교를 시각화
- [[feature-f2-quiz-generation]] — implements: F6의 재퀴즈가 F2의 API를 재사용
- [[feature-f4-heatmap]] — upstream: F4 히트맵이 재퀴즈 필요성을 강사에게 시각적으로 알림
- [[feature-f5-ai-coaching]] — upstream: F5 코칭이 재퀴즈 전 재설명 단계
- [[role-teacher]] — upstream: 강사가 수동으로 재퀴즈 생성을 트리거

## Gotchas

- **delta는 첫-마지막만 비교**: round가 3개 이상이어도 delta는 R1과 마지막 round만 비교한다. R2→R3 개선이 delta에 반영되지 않는다 — `analysis/route.ts` L143-149.
- **재퀴즈 토픽 지정은 강사 수동**: F6에 자동 재출제 로직이 없다. 강사가 "어떤 토픽을 재출제할지" 직접 판단해 F2를 수동으로 재호출해야 한다.

## Changelog

- 2026-04-11 — 초판 작성 (planner)
