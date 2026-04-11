---
type: concept
id: concept-quiz
related:
  - "[[concept-session]]"
  - "[[concept-understanding-score]]"
  - "[[concept-heatmap]]"
  - "[[concept-risk-signal]]"
  - "[[feature-f2-quiz-generation]]"
  - "[[feature-f6-feedback-loop]]"
  - "[[lib-ai-prompts]]"
  - "[[lib-ai-schemas]]"
  - "[[role-teacher]]"
  - "[[role-student]]"
sources:
  - "supabase/migrations/00001_initial_schema.sql#quizzes"
  - "src/app/api/ai/quiz/route.ts"
  - "src/app/api/quizzes/route.ts"
  - "src/lib/ai/schemas/quiz.ts"
  - "src/lib/ai/prompts/quiz-generation.ts"
  - "src/lib/constants.ts"
updated: 2026-04-11
owner: planner
---

# Quiz (퀴즈)

## Summary

강사가 AI에 의뢰해 생성하고, active 세션 내에서 수강생에게 출제하는 평가 단위. `round_number`로 회차를 구분해 피드백 루프(재퀴즈)를 지원하며, 5가지 문제 유형과 misconception_tags 기반 오개념 추적이 핵심이다.

## Key Claims

- `question_type` CHECK 제약은 `'multiple_choice'`, `'true_false'`, `'code_output'`, `'find_bug'`, `'fill_blank'` 5값만 허용한다 — `migrations/00001_initial_schema.sql` L129-132
- `POST /api/ai/quiz`는 `teacher` 또는 `owner` role만 허용하며, 추가로 `session.teacher_id === user.id` 소유권 검증을 이중으로 수행한다 — `src/app/api/ai/quiz/route.ts` L87, L130
- AI 퀴즈 생성은 `temperature: 0.3` (`AI_TEMPERATURE_QUIZ` 상수)으로 고정되며, 실패 시 1회 재시도 후 502를 반환한다 — `route.ts` L43-46, L197-218
- `GET /api/quizzes`에서 수강생은 **이미 응답 완료한 퀴즈에만** `correct_answer`를 받는다; 미응답 퀴즈는 해당 필드가 제거된다 — `src/app/api/quizzes/route.ts` L62-88
- `round_number`는 서버가 기존 퀴즈의 `MAX(round_number) + 1`로 자동 계산한다; 클라이언트가 지정하지 않는다 — `route.ts` L139-146
- 동일 토픽의 기존 문제 텍스트가 AI 프롬프트 "절대 중복 금지" 섹션에 자동 삽입되어 재출제를 방지한다 — `route.ts` L149-155, `prompts/quiz-generation.ts` L53-56
- `quizzes_insert_teacher` RLS는 `session.teacher_id = auth.uid()` 조건으로 타 강사의 세션에 퀴즈 삽입을 차단한다 — `migrations/00001_initial_schema.sql` L155-160

## Intuition / Why

KIT 직업훈련 환경에서 강사는 "지금 이 수강생이 방금 설명한 내용을 이해했는가"를 즉각 확인하고 싶다. 퀴즈는 그 확인 도구다. AI가 즉석 생성하기 때문에 강사가 미리 문제를 준비할 필요가 없다.

`round_number` 설계: 1회차 퀴즈 결과에서 이해도가 낮은 수강생을 발견하면, 강사는 AI 코칭을 제공한 뒤 동일 토픽으로 2회차 퀴즈(재퀴즈)를 낸다. 이 피드백 루프가 Argos의 핵심 차별점이다. 회차를 `round_number`로 구분해 히트맵과 분석 결과가 회차별 이해도 변화를 추적할 수 있다.

`correct_answer` 조건부 노출: 수강생이 응답 전에 정답을 알면 평가 의미가 없다. 응답 완료한 퀴즈에만 정답을 내려줌으로써 즉각 피드백과 시험 공정성을 동시에 달성한다.

5가지 유형 설계: KIT 직업훈련 과정(Spring/React/Python/보안/네트워크)은 이론보다 코드 실습 비중이 높다. `code_output`, `find_bug`, `fill_blank` 3개 유형이 코드 이해도를 직접 측정하도록 특화됐다.

## Details

### quizzes 테이블 핵심 컬럼

| 컬럼 | 역할 |
|------|------|
| `session_id` | 소속 세션 (FK, CASCADE DELETE) |
| `question_type` | 5가지 유형 (CHECK 제약) |
| `code_snippet` | 코드 유형 문제의 코드 블록 (nullable) |
| `code_language` | `java` / `javascript` / `python` / null |
| `options` | JSONB 배열. 2~5개 선택지 |
| `correct_answer` | 정답 (options 중 하나) |
| `topic_tag` | AI가 분류한 세부 토픽 (이해도 집계 기준) |
| `misconception_tags` | JSONB 배열. 흔한 오개념 레이블 |
| `round_number` | 회차 (default 1, 재퀴즈 시 증가) |
| `order_index` | 세션 내 출제 순서 |

### AI 생성 파이프라인

```
POST /api/ai/quiz
  → Zod 입력 검증 (QuizRequestSchema)
  → teacher 소유권 이중 검증
  → MAX(round_number) 계산
  → 기존 동일토픽 문제 조회 (중복 방지용)
  → buildQuizSystemPrompt() + buildQuizUserPrompt()
  → generateText({ output: Output.object({ schema: QuizGenerationResponseSchema }) })
  → Zod 검증 (GeneratedQuizQuestionSchema)
  → quizzes 테이블 INSERT (round_number, order_index 포함)
```

### 퀴즈 유형별 특성

| 유형 | code_snippet 필수 | options 범위 | 주요 측정 |
|------|-------------------|--------------|-----------|
| `multiple_choice` | 선택 | 2~5개 | 개념 이해 |
| `true_false` | 선택 | 반드시 ["True","False"] | 참거짓 판단 |
| `code_output` | **필수** | 2~5개 | 코드 실행 예측 |
| `find_bug` | **필수** | 2~5개 | 디버깅 능력 |
| `fill_blank` | **필수** (___로 빈칸) | 2~5개 | 코드 작성 능력 |

## Connections

- [[concept-session]] — upstream: 퀴즈는 세션에 귀속되며 session_id로 연결, 세션 삭제 시 CASCADE 삭제
- [[concept-understanding-score]] — downstream: topic_tag별 정답률이 이해도 점수 계산의 입력값
- [[concept-heatmap]] — downstream: 회차별(round_number) 퀴즈 응답 데이터가 히트맵으로 시각화
- [[concept-risk-signal]] — downstream: misconception_tags와 오답률이 위험 신호 감지의 원천 데이터
- [[feature-f2-quiz-generation]] — implements: F2가 이 개념의 AI 생성 파이프라인 구현
- [[feature-f6-feedback-loop]] — implements: F6의 재퀴즈가 round_number 2이상 퀴즈를 생성
- [[lib-ai-prompts]] — see-also: `quiz-generation.ts`가 시스템/유저 프롬프트 분리 보관
- [[lib-ai-schemas]] — see-also: `quiz.ts`가 GeneratedQuizQuestionSchema, QuizGenerationResponseSchema 정의
- [[role-teacher]] — upstream: 강사만 AI 퀴즈 생성 가능 (소유권 이중 검증)
- [[role-student]] — see-also: 수강생은 응답 완료 전 correct_answer 비노출

## Gotchas

- **`true_false` options 형식 고정**: 시스템 프롬프트에 `options: ["True", "False"]`로 명시돼 있으나, AI가 `["참", "거짓"]` 또는 `["O", "X"]`로 반환할 때 Zod는 통과하지만 프론트엔드가 예상 텍스트와 불일치할 수 있다. 현재 Zod 스키마에 `refine()` 검증 없음 — 이슈 미기록.
- **`code_snippet` 필수 강제 미검증**: `code_output`, `find_bug`, `fill_blank` 유형은 시스템 프롬프트 규칙으로 `code_snippet`을 필수로 안내하지만, Zod 스키마(`GeneratedQuizQuestionSchema`)에서 `code_snippet`은 `nullable().optional()`이다. AI가 규칙을 어기고 null을 반환해도 검증 통과 — `src/lib/ai/schemas/quiz.ts` L16.
- **재시도 중복 문제 가능성**: `generateQuizzesWithRetry()`에서 1차 실패 후 재시도 시, 같은 `existingQuestions` 목록을 사용한다. 그러나 1차 시도에서 일부 문제가 DB에 부분 저장된 경우 existingQuestions가 갱신되지 않아 중복이 생길 수 있다. 현재 route.ts는 `generateQuizzesWithRetry` 호출 전 INSERT가 없으므로 실제 발생 가능성은 낮다 — 구조 변경 시 주의.
- **`order_index` 동시 삽입 경합**: 동일 세션에서 두 요청이 동시에 도달하면 같은 `round_number`와 겹치는 `order_index`로 삽입될 수 있다. UNIQUE 제약 없어 DB 레벨 차단 없음 — 단일 강사 세션 모델에서는 실제 발생 거의 없으나 `(session_id, round_number, order_index)` UNIQUE 검토 필요.

## Changelog

- 2026-04-11 — 초판 작성 (planner)
