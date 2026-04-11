---
type: api
id: api-ai-analysis
related:
  - "[[api-responses]]"
  - "[[concept-understanding-score]]"
  - "[[concept-heatmap]]"
  - "[[api-ai-coaching]]"
  - "[[lib-constants]]"
  - "[[screen-instructor-session-detail]]"
sources:
  - "src/app/api/ai/analysis/route.ts"
updated: 2026-04-11
owner: analyst-2
---

# api-ai-analysis — GET/POST /api/ai/analysis

## Summary

세션 응답 데이터를 집계해 토픽별 이해도·약점·오답 패턴을 계산하는 엔드포인트. AI 호출 없음 — 순수 서버사이드 계산. POST는 `analysis_results` 테이블에 저장, GET은 조회.

## Key Claims

- 인가: `role IN ('owner', 'teacher', 'mentor')`.
- GET `?sessionId&round?`: round 지정 시 해당 라운드만, 미지정 시 전체 라운드 + delta 계산.
- POST `{ sessionId }`: 전체 라운드 분석 후 `analysis_type="realtime"`으로 저장. 201 반환.
- `computeUnderstandingScores()`: topic별 정답률 0~100.
- `extractWeakTopics()`: `score <= WEAK_TOPIC_THRESHOLD(60)`.
- `buildMisconceptionClusters()`: 오답 패턴 topic별 집계.
- `computeDelta()`: 첫 라운드 vs 마지막 라운드 점수 차이 (round 2개 이상 필요).
- 응답 없을 시 422 (분석 불가).

## Intuition / Why

AI 코칭 프롬프트에 이해도 데이터가 필요 — analysis_results에 미리 저장해두면 coaching API가 DB에서 꺼내 쓸 수 있다. 실시간 히트맵용 GET과 코칭용 POST가 같은 계산 로직 공유.

## Details

responses + quizzes JOIN 조회:
```sql
responses.select("id, quiz_id, student_id, selected_answer, is_correct, round_number,
  quizzes(topic_tag, misconception_tags, correct_answer)")
.eq("session_id", sessionId)
```

Supabase join 결과는 `unknown` 캐스팅 필요 (Relationships 미정의).

## Connections

- [[api-responses]] — upstream: responses 데이터를 집계
- [[concept-understanding-score]] — implements: topic별 정답률 계산
- [[concept-heatmap]] — implements: 이해도 데이터가 히트맵 원천
- [[api-ai-coaching]] — downstream: POST analysis_results → coaching API가 조회
- [[lib-constants]] — upstream: WEAK_TOPIC_THRESHOLD
- [[screen-instructor-session-detail]] — downstream: 히트맵·약점토픽 UI

## Gotchas

- **422 응답 없음**: 응답 데이터가 0개면 422. 프론트엔드에서 "아직 응답이 없습니다" 처리 필요.
- **delta 1라운드 시 빈 객체**: `computeDelta()`는 rounds.length < 2이면 `{}` 반환. 단일 라운드 시 delta: {}.
- **POST vs GET 이중성**: GET은 저장 없이 계산만, POST는 DB 저장. 실시간 폴링 시 GET 사용, 코칭 전 스냅샷 저장 시 POST 사용.

## Changelog

- 초기 — GET/POST /api/ai/analysis 구현 (서버사이드 집계, delta, misconceptionClusters)
