---
type: component
id: component-understanding-heatmap
related:
  - "[[concept-heatmap]]"
  - "[[api-ai-analysis]]"
  - "[[hook-use-realtime]]"
  - "[[screen-instructor-session-detail]]"
sources:
  - "src/components/heatmap/understanding-heatmap.tsx"
updated: 2026-04-11
owner: analyst-2
---

# component-understanding-heatmap — UnderstandingHeatmap

## Summary

수강생×토픽 교차 히트맵 컴포넌트. responses + quizzes + participants를 props로 받아 topic별 정답률을 계산하고 색상 코딩으로 표시.

## Key Claims

- `"use client"` — 클라이언트 컴포넌트.
- Props: `{ responses: ResponseRow[], quizzes: QuizRow[], participants: ParticipantInfo[] }`.
- 토픽 목록: `[...new Set(quizzes.map(q => q.topic_tag))]` — quizzes에서 동적 추출.
- 정답률 계산: 수강생×토픽별로 `correct / total * 100` (미응답 시 `null` → "-" 표시).
- 색상: `≥80% → green`, `≥60% → yellow`, `<60% → red`, `null → muted`.
- overflow-x-auto + sticky 첫 열 — 수강생 이름 컬럼은 스크롤 시 고정.

## Intuition / Why

강사가 실시간으로 어떤 수강생이 어떤 토픽에서 어려움을 겪는지 한눈에 파악. Realtime으로 responses가 갱신되면 props 재전달로 히트맵 자동 업데이트.

## Details

```ts
function getTopicAccuracy(studentId: string, topic: string): number | null {
  const topicQuizzes = quizzes.filter(q => q.topic_tag === topic);
  // 해당 토픽에 응답한 것만 계산 — 응답 없으면 null
}
```

`responseMap`: `Map<studentId, Map<quizId, ResponseRow>>` 이중 맵으로 O(1) 조회.

## Connections

- [[concept-heatmap]] — implements: 수강생×토픽 히트맵 개념
- [[api-ai-analysis]] — upstream: 분석 데이터로 히트맵 props 구성
- [[hook-use-realtime]] — upstream: Realtime 응답 갱신 → 부모가 responses prop 업데이트
- [[screen-instructor-session-detail]] — downstream: 강사 세션 화면에서 렌더

## Gotchas

- **quizzes가 빈 배열**: quizzes.length === 0이면 "퀴즈와 참여자가 있으면..." 메시지 표시.
- **한 토픽 복수 퀴즈**: 같은 topic_tag의 퀴즈가 여러 개면 모두 정답률에 포함.
- **round 필터 없음**: 모든 round의 응답이 합산됨. round별 히트맵은 상위 컴포넌트에서 responses를 필터링해 전달해야 함.

## Changelog

- 초기 — UnderstandingHeatmap 구현 (이중 Map 최적화, null 처리, sticky 첫 열)
