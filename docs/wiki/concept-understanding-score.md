---
type: concept
id: concept-understanding-score
related:
  - "[[concept-session]]"
  - "[[concept-quiz]]"
  - "[[concept-heatmap]]"
  - "[[concept-risk-signal]]"
  - "[[feature-f4-heatmap]]"
  - "[[feature-f5-ai-coaching]]"
  - "[[feature-f6-feedback-loop]]"
  - "[[role-teacher]]"
  - "[[role-mentor]]"
sources:
  - "supabase/migrations/00001_initial_schema.sql#analysis_results"
  - "src/app/api/ai/analysis/route.ts"
  - "src/lib/constants.ts#WEAK_TOPIC_THRESHOLD"
updated: 2026-04-11
owner: planner
---

# Understanding Score (이해도 점수)

## Summary

세션 내 수강생 응답 데이터를 `topic_tag`별로 집계한 정답률(0~100 정수). 특정 토픽 점수가 `WEAK_TOPIC_THRESHOLD`(60) 이하면 "약점 토픽"으로 분류되어 AI 코칭과 재퀴즈의 입력이 된다. 회차(round_number)별로 분리 계산되며, 회차 간 델타(변화량)가 학습 효과를 수치화한다.

## Key Claims

- 이해도 점수 공식: `Math.round((correct / total) * 100)` — 응답 0건인 토픽은 0으로 처리한다 — `src/app/api/ai/analysis/route.ts` L54
- `WEAK_TOPIC_THRESHOLD = 60` 상수로 약점 토픽 기준이 60% 이하로 고정된다 — `src/lib/constants.ts` L16
- `GET /api/ai/analysis`와 `POST /api/ai/analysis` 모두 `teacher`, `owner`, `mentor` 3개 role에 허용된다; `student`는 403을 받는다 — `route.ts` L171, L301
- `POST /api/ai/analysis`는 분석 결과를 `analysis_results` 테이블(`analysis_type='realtime'`)에 저장한다; `GET`은 저장 없이 on-demand 계산만 한다 — `route.ts` L388-398, L257-263
- 델타(delta)는 같은 세션에서 `첫 번째 round 점수 - 마지막 round 점수` 차이로, round가 2개 이상일 때만 계산되고 1개 round면 빈 객체 `{}`가 반환된다 — `route.ts` L125-152
- `analysis_results.understanding_scores`는 `{ [topic_tag]: 0~100 }` 형태의 JSONB 컬럼이다 — `migrations/00001_initial_schema.sql` L195

## Intuition / Why

강사는 "배열 인덱스를 73%가 틀렸다"는 숫자보다 "배열 인덱스 이해도 27점"이라는 직관적 수치를 원한다. `(정답/전체)×100` 공식은 단순하지만 강사가 즉각 해석할 수 있다.

60점 임계값의 선택 이유: KIT 직업훈련 합격 기준이 통상 60%이므로, 같은 임계값을 이해도 판단 기준으로 채택했다. 이 수치가 CLAUDE.md 절대규칙 20조(매직 넘버 금지)에 따라 `WEAK_TOPIC_THRESHOLD` 상수로 분리된 이유이기도 하다.

델타 설계: 1회차 퀴즈 → AI 코칭 → 2회차 퀴즈의 피드백 루프에서 "코칭이 실제로 효과가 있었는가"를 숫자로 보여주는 것이 델타다. 양수 델타는 개선, 음수 델타는 오히려 이해도 저하를 의미한다.

POST vs GET 분리: `POST`는 수업 중 강사가 "지금 분석해줘"를 누를 때 실시간으로 저장이 필요하다. `GET`은 히트맵/리포트 화면에서 읽기 전용으로 round 필터를 붙여 조회할 때 사용한다.

## Details

### 분석 파이프라인 (computeUnderstandingScores)

```
responses JOIN quizzes (topic_tag, misconception_tags, correct_answer)
  → topic_tag별 { correct: n, total: n } 집계
  → Math.round(correct/total * 100) → understandingScores: { [topic]: 0~100 }
  → score <= 60 → weakTopics: string[]
  → 오답 응답 → topic별 wrongAnswer 빈도 집계 → misconceptionClusters
```

### analysis_results 테이블 핵심 컬럼

| 컬럼 | 역할 |
|------|------|
| `session_id` | 소속 세션 (FK, CASCADE DELETE) |
| `analysis_type` | `'realtime'` (수업 중) / `'post_session'` (수업 후) |
| `understanding_scores` | JSONB `{ topic: 0~100 }` |
| `weak_topics` | JSONB 배열 — 60점 이하 토픽 목록 |
| `misconception_clusters` | JSONB `{ topic: [{wrongAnswer, count, misconceptionTags}] }` |

### GET 응답 구조 (round 미지정 시)

```json
{
  "data": {
    "rounds": [
      { "round": 1, "understandingScores": { "배열 인덱스": 27 }, "weakTopics": ["배열 인덱스"] },
      { "round": 2, "understandingScores": { "배열 인덱스": 73 }, "weakTopics": [] }
    ],
    "delta": { "배열 인덱스": 46 }
  }
}
```

## Connections

- [[concept-session]] — upstream: 이해도 점수는 세션 단위로 집계되며 analysis_results가 session_id로 귀속
- [[concept-quiz]] — upstream: topic_tag별 정답/오답이 이해도 점수의 원천 데이터
- [[concept-heatmap]] — downstream: 이해도 점수가 히트맵의 셀 색상(0-100 그라데이션) 입력값
- [[concept-risk-signal]] — downstream: 약점 토픽(weak_topics)과 델타 음수가 위험 신호의 트리거
- [[feature-f4-heatmap]] — implements: F4가 이 개념의 시각화 구현
- [[feature-f5-ai-coaching]] — downstream: AI 코칭은 weak_topics와 misconception_clusters를 컨텍스트로 사용
- [[feature-f6-feedback-loop]] — downstream: F6 재퀴즈 결과가 round N+1 이해도 점수가 되어 델타를 생성
- [[role-teacher]] — upstream: 강사가 POST로 분석을 트리거
- [[role-mentor]] — see-also: mentor는 GET으로 읽기 접근 허용 (POST도 허용되나 주로 읽기 용도)

## Gotchas

- **응답 0건 토픽 점수 0**: `stats.total > 0 ? Math.round(...) : 0` — 아무도 응답하지 않은 퀴즈의 토픽이 분석 결과에 포함되면 0점(약점)으로 처리된다. 이는 미응답 토픽을 약점으로 오분류할 수 있다. 현재 round 내 응답이 0건인 경우 422 반환으로 진입 차단하지만, 특정 토픽만 응답 0건인 경우는 차단되지 않는다 — `route.ts` L54.
- **GET은 저장하지 않는다**: `GET /api/ai/analysis`는 조회 후 `analysis_results`에 INSERT하지 않는다. 히트맵 화면이 GET만 사용하는 경우 분석 이력이 남지 않는다. POST를 명시적으로 호출해야 `analysis_results` 테이블에 기록이 생긴다 — `route.ts` L257-263.
- **delta는 마지막-첫 번째만 비교**: 중간 round (예: round 1→2→3에서 round 2)의 변화는 delta에 반영되지 않는다. `computeDelta`가 `sortedRounds[0]`과 `sortedRounds[rounds.length - 1]`만 비교하기 때문 — `route.ts` L143-149. round 3 리포트 화면에서 "2→3 개선"이 누락될 수 있다.
- **mentor의 POST 분석 트리거 가능**: mentor는 GET뿐 아니라 POST도 허용된다 (`route.ts` L301). 이는 mentor가 수업 중 강사 모르게 분석을 트리거하고 `analysis_results`를 생성할 수 있다는 의미다. 의도된 설계인지 확인 필요.

## Changelog

- 2026-04-11 — 초판 작성 (planner)
