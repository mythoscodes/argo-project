---
type: feature
id: feature-f4-heatmap
related:
  - "[[concept-heatmap]]"
  - "[[concept-understanding-score]]"
  - "[[concept-quiz]]"
  - "[[component-understanding-heatmap]]"
  - "[[hook-use-realtime]]"
  - "[[feature-f3-response-collection]]"
  - "[[feature-f5-ai-coaching]]"
  - "[[role-teacher]]"
sources:
  - "src/components/heatmap/understanding-heatmap.tsx"
  - "src/hooks/use-realtime.ts"
  - "src/app/api/ai/analysis/route.ts"
  - "docs/tc/instructor-session-detail.md#1-3 Heatmap"
updated: 2026-04-11
owner: planner
---

# F4: Understanding Heatmap (이해도 히트맵)

## Summary

수강생×토픽 교차 테이블로 학급 이해도를 색상으로 시각화하는 기능. `UnderstandingHeatmap` 컴포넌트가 렌더링하고, `useRealtimeResponses` 훅이 응답 수집과 연동해 실시간으로 셀을 갱신한다.

## Key Claims

- 히트맵은 클라이언트 사이드(`'use client'`)에서 완전히 계산된다; 별도 집계 API 없이 `responses` + `quizzes` + `participants` prop만으로 렌더링된다 — `understanding-heatmap.tsx` L1, L20
- 색상 임계값: ≥80% 초록 / 60-79% 노랑 / <60% 빨강 / 미응답 회색 — `understanding-heatmap.tsx` L57-61
- `GET /api/ai/analysis`(POST 아님)는 저장 없이 on-demand로 이해도 점수를 계산해 반환한다; 히트맵 화면에서 분석 수치가 필요할 때 호출 — `src/app/api/ai/analysis/route.ts` L154-282
- F4는 F3(`useRealtimeResponses`)에 의존한다; 응답이 실시간으로 들어오면 자동으로 히트맵이 갱신된다

## Intuition / Why

강사가 수업 중 30명의 이해 상태를 1초 안에 파악해야 한다. 숫자 테이블보다 색상이 훨씬 빠르다. 빨간 셀 밀집 토픽 = 재설명 필요, 특정 행만 빨간 = 그 수강생 개별 케어 신호.

## Connections

- [[concept-heatmap]] — implements: F4가 히트맵 개념의 UI + 실시간 구독 end-to-end 구현
- [[concept-understanding-score]] — upstream: 히트맵의 셀 계산이 이해도 점수 공식(정답/전체×100) 사용
- [[concept-quiz]] — upstream: quizzes prop의 topic_tag가 히트맵 열 정의
- [[component-understanding-heatmap]] — implements: UnderstandingHeatmap 컴포넌트가 렌더링 구현
- [[hook-use-realtime]] — implements: useRealtimeResponses가 실시간 응답 구독 담당
- [[feature-f3-response-collection]] — upstream: F3 응답이 F4 히트맵의 데이터 소스
- [[feature-f5-ai-coaching]] — downstream: 히트맵의 빨간 셀이 AI 코칭 트리거의 시각적 신호
- [[role-teacher]] — upstream: 히트맵은 강사 대시보드에서만 표시

## Gotchas

- **자동 재연결 없음**: 실시간 구독 끊김 시 히트맵이 동결된다 — `use-realtime.ts` L70-74. ISD-RT-003 TC 커버.
- **GET 분석 API 결과 저장 안 됨**: `GET /api/ai/analysis` 호출로 이해도 수치를 히트맵 옆에 표시해도 `analysis_results` 테이블에는 저장되지 않는다. 히스토리 추적이 필요하면 `POST` 명시 호출 필요.

## Changelog

- 2026-04-11 — 초판 작성 (planner)
