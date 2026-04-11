---
type: component
id: component-delta-chart
related:
  - "[[api-ai-analysis]]"
  - "[[concept-understanding-score]]"
  - "[[screen-instructor-session-detail]]"
sources:
  - "src/components/charts/delta-chart.tsx"
updated: 2026-04-11
owner: analyst-2
---

# component-delta-chart — DeltaChart

## Summary

라운드 간 토픽별 이해도 변화(delta)를 수평 막대 그래프로 표시. Recharts BarChart 사용. `GET /api/ai/analysis?sessionId&round` 자체 호출.

## Key Claims

- `"use client"` — useEffect 내부에서 fetch.
- Props: `{ sessionId: string, currentRound: number }`.
- `GET /api/ai/analysis?sessionId={id}&round={n}` — currentRound 기준 단일 라운드 조회.
- `delta` 계산: `current - previous`. API 응답 `analysis.delta`에서 읽음.
- 색상: `delta >= 0 → #22c55e(green)`, `delta < 0 → #ef4444(red)`.
- X축 domain: `[-30, 30]` — ±30% 범위 고정.
- 데이터 없으면 "아직 델타 데이터가 없습니다" 메시지.

## Intuition / Why

재퀴즈 후 강사가 "이 토픽의 이해도가 얼마나 올랐는지" 한눈에 확인. 초록=개선, 빨강=악화.

## Details

```ts
// DeltaData 구성
current: score
previous: score - (delta[topic] ?? 0)
delta: delta[topic] ?? 0
```

API 응답 `analysis.delta`는 `{ [topic]: number }` 형태. `analysis.understanding_scores`에서 현재 점수를 읽고, delta를 역산해 previous 계산.

**주의**: API 응답 구조가 `{ data: { rounds, delta } }`인데, 컴포넌트는 `result.data.understanding_scores`와 `result.data.delta`를 직접 접근. round 단일 조회 시 API가 `{ rounds: [{understandingScores, weakTopics}], delta: {} }` 반환 — `understanding_scores` 키가 다름.

## Connections

- [[api-ai-analysis]] — upstream: GET 자체 호출 (round 파라미터)
- [[concept-understanding-score]] — see-also: 토픽별 정답률(0~100)
- [[screen-instructor-session-detail]] — downstream: 강사 화면 "회차 변화" 섹션

## Gotchas

- **API 응답 키 불일치**: API는 `understandingScores` (camelCase), 컴포넌트는 `understanding_scores` (snake_case)를 기대. 데이터가 없거나 빈 그래프가 표시될 수 있음 — 확인 필요.
- **X축 고정 범위 ±30**: delta가 ±30%를 초과하면 막대가 잘림.
- **round=1**: 첫 라운드는 delta 비교 대상 없음 → delta: {} → 데이터 없음 메시지.

## Changelog

- 초기 — DeltaChart 구현 (Recharts BarChart, Cell 색상, ±30 domain)
