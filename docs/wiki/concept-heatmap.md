---
type: concept
id: concept-heatmap
related:
  - "[[concept-session]]"
  - "[[concept-quiz]]"
  - "[[concept-understanding-score]]"
  - "[[concept-risk-signal]]"
  - "[[feature-f4-heatmap]]"
  - "[[component-understanding-heatmap]]"
  - "[[hook-use-realtime]]"
  - "[[role-teacher]]"
sources:
  - "src/components/heatmap/understanding-heatmap.tsx"
  - "src/hooks/use-realtime.ts"
  - "src/app/api/ai/analysis/route.ts"
  - "docs/tc/instructor-session-detail.md#1-3 Heatmap"
updated: 2026-04-11
owner: planner
---

# Heatmap (이해도 히트맵)

## Summary

`UnderstandingHeatmap` 컴포넌트가 렌더링하는 수강생×토픽 교차 테이블. 각 셀은 해당 수강생의 해당 토픽 정답률을 색상(초록/노랑/빨강)으로 시각화한다. `useRealtimeResponses` 훅이 Supabase Realtime을 구독해 수강생이 응답할 때마다 셀이 자동 갱신된다.

## Key Claims

- 히트맵 셀 색상 임계값: **80% 이상 → 초록**, **60-79% → 노랑**, **60% 미만 → 빨강** — `src/components/heatmap/understanding-heatmap.tsx` L57-61
- 응답이 없는 셀(미응답)은 `null`로 처리되어 색상 없이 `"-"` 표시된다; 0점과 미응답은 구별된다 — `understanding-heatmap.tsx` L42-54
- `useRealtimeResponses`는 `responses.channel`을 `INSERT` 이벤트만 구독한다; `UPDATE`/`DELETE` 이벤트는 무시한다 — `src/hooks/use-realtime.ts` L49-65
- Realtime 채널 상태가 `CHANNEL_ERROR` 또는 `TIMED_OUT`이 되면 `isConnected=false`, `error` 문자열이 노출된다; 자동 재연결 로직은 없다 — `use-realtime.ts` L70-74
- 히트맵 행(수강생) 순서는 `participants` prop 배열 순서를 그대로 따른다; 자동 정렬 없다 — `understanding-heatmap.tsx` L79
- 히트맵 열(토픽) 순서는 `quizzes` prop에서 `Set`으로 중복 제거한 순서이므로 퀴즈 삽입 순서에 의존한다 — `understanding-heatmap.tsx` L30

## Intuition / Why

강사가 수업 중 수강생 30명의 이해 상태를 한눈에 파악하려면 숫자 나열보다 색상이 훨씬 빠르다. "빨간 셀이 많은 행"은 이해가 느린 수강생, "빨간 셀이 많은 열"은 잘못 설명된 토픽이다. 강사는 이 패턴을 즉각 읽고 AI 코칭이나 재퀴즈 결정을 내릴 수 있다.

실시간 갱신이 중요한 이유: 수업이 진행되는 45분 동안 응답이 계속 들어온다. 새로고침 없이 실시간으로 셀이 갱신되지 않으면 강사가 화면을 주시하는 의미가 없다.

0점과 미응답 구별: "이 수강생이 배열 인덱스를 100% 틀렸다"와 "이 수강생이 아직 응답하지 않았다"는 완전히 다른 상황이다. `null` vs `0`으로 구별해 강사가 잘못된 개입을 하지 않도록 한다.

## Details

### 히트맵 렌더링 로직

```
props: { responses, quizzes, participants }
  → topics = [...new Set(quizzes.map(q => q.topic_tag))]
  → responseMap: Map<studentId, Map<quizId, ResponseRow>>
  → 각 셀: getTopicAccuracy(studentId, topic)
    → topicQuizzes 필터 → studentResponses JOIN
    → relevantResponses.length === 0 → null (미응답)
    → Math.round(correct / total * 100) → 0~100
  → getCellColor(accuracy) → Tailwind 클래스
```

### 색상 기준표

| 정답률 | 색상 | Tailwind 클래스 |
|--------|------|-----------------|
| 80% 이상 | 초록 | `bg-green-100 text-green-800 border-green-200` |
| 60~79% | 노랑 | `bg-yellow-100 text-yellow-800 border-yellow-200` |
| 60% 미만 | 빨강 | `bg-red-100 text-red-800 border-red-200` |
| 미응답(null) | 회색 | `bg-muted text-muted-foreground` |

### Realtime 구독 패턴 (useRealtimeResponses)

```
mount → loadExisting() (초기 전체 조회)
  → supabase.channel(`responses:session_id=eq.${sessionId}`)
  → .on('postgres_changes', { event: 'INSERT', filter: `session_id=eq.${sessionId}` })
  → payload.new → 중복 체크 (prev.some(r => r.id === newId))
  → setResponses([...prev, newResponse])
unmount → channel.unsubscribe()
```

## Connections

- [[concept-session]] — upstream: 히트맵은 세션 내 응답 데이터 시각화 (sessionId로 구독 필터링)
- [[concept-quiz]] — upstream: quizzes prop이 토픽 열과 셀 계산의 기준
- [[concept-understanding-score]] — see-also: 개인별 토픽 정답률 계산은 analysis/route.ts의 computeUnderstandingScores와 동일 로직 (컴포넌트 내 독립 구현)
- [[concept-risk-signal]] — downstream: 빨간 셀 패턴이 위험 신호의 시각적 표현
- [[feature-f4-heatmap]] — implements: F4가 이 개념의 UI + 실시간 구독 end-to-end 구현
- [[component-understanding-heatmap]] — implements: UnderstandingHeatmap 컴포넌트가 렌더링 담당
- [[hook-use-realtime]] — implements: useRealtimeResponses 훅이 실시간 구독 담당
- [[role-teacher]] — upstream: 히트맵은 강사 대시보드에서만 노출 (수강생에게 비공개)

## Gotchas

- **자동 재연결 없음**: `CHANNEL_ERROR` / `TIMED_OUT` 발생 시 에러 상태로 전환되지만 재연결을 시도하지 않는다. 강사가 화면을 인지하지 못하면 실시간 갱신이 멈춘 채 수업이 진행된다 — `use-realtime.ts` L70-74. ISD-RT-003 TC로 시나리오 커버됨.
- **토픽 열 순서 비결정적**: `[...new Set(quizzes.map(q => q.topic_tag))]`는 JS Set 삽입 순서를 따르므로 퀴즈 생성 순서에 의존한다. 같은 세션이라도 round 2 퀴즈가 추가되면 열 순서가 바뀔 수 있다 — `understanding-heatmap.tsx` L30.
- **개인별 정답률 = 세션 집계 정답률 아님**: `getTopicAccuracy`는 개인별(student×topic) 정답률이고, `computeUnderstandingScores`(analysis API)는 학급 전체(topic) 정답률이다. 두 값은 다른 숫자이며 히트맵과 분석 리포트 간 "수치 불일치"처럼 보일 수 있다.
- **`sticky` 컬럼 z-index 충돌**: 수강생 이름 열이 `sticky left-0 z-10`으로 고정되어 있으나 모달/드롭다운이 오버레이될 경우 z-index 충돌 가능 — `understanding-heatmap.tsx` L81.

## Changelog

- 2026-04-11 — 초판 작성 (planner)
