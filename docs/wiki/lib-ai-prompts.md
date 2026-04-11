---
type: lib
id: lib-ai-prompts
related:
  - "[[lib-ai-model]]"
  - "[[lib-ai-schemas]]"
  - "[[api-ai-quiz]]"
  - "[[api-ai-coaching]]"
  - "[[api-ai-report]]"
  - "[[api-ai-mentor-briefing]]"
sources:
  - "src/lib/ai/prompts/quiz-generation.ts"
  - "src/lib/ai/prompts/coaching.ts"
  - "src/lib/ai/prompts/report.ts"
  - "src/lib/ai/prompts/mentor-briefing.ts"
  - "CLAUDE.md#AI-프롬프트-작성-규칙"
updated: 2026-04-11
owner: analyst-2
---

# lib-ai-prompts — AI 프롬프트 함수 모음

## Summary

퀴즈 생성·코칭·리포트·멘토 브리핑의 시스템/유저 프롬프트를 함수로 export하는 모듈 모음. CLAUDE.md 규칙 #11 "AI 프롬프트는 `src/lib/ai/prompts/`에 분리 — API Route에 인라인 금지"의 구현체.

## Key Claims

- 모든 프롬프트는 `build{Purpose}SystemPrompt()` + `build{Purpose}UserPrompt(params)` 쌍으로 구성된다.
- `quiz-generation.ts`의 `getFewShotExample(subject)`: subject 문자열에 따라 Spring/Java, React/JS, Python, 보안, 네트워크 5개 과정별 few-shot 예시를 동적으로 반환. 매칭 없으면 JavaScript 기본 예시.
- 시스템 프롬프트에 공통으로 포함: "코리아IT아카데미(KIT)", "성인 직업훈련생", "비전공자~경력자 편차" — CLAUDE.md KIT 컨텍스트 요구사항.
- 퀴즈 유형 5가지: `multiple_choice`, `true_false`, `code_output`, `find_bug`, `fill_blank`.
- 코칭/리포트/멘토 브리핑 응답은 모두 JSON 형식 요구 — Zod 스키마 검증과 연동.

## Intuition / Why

KIT 성인 직업훈련 환경에서는 일반 퀴즈 프롬프트가 맞지 않는다. 비전공자도 이해 가능한 설명, 실무 코드 중심 문제, 과목별(Java/Python/보안) 다른 유형이 필요하다. few-shot으로 과목별 예시를 동적 삽입하면 모델이 KIT 맥락을 빠르게 파악한다.

프롬프트를 API Route에 인라인으로 두면 프롬프트 버전 관리, A/B 테스트, 여러 Route 간 공유가 어렵다. 분리된 함수로 두면 모든 AI API Route가 동일 프롬프트를 공유하고, 테스트(`*.test.ts`)도 가능하다.

## Details

**프롬프트 파일 구조**:

| 파일 | export 함수 | 용도 |
|------|------------|------|
| `quiz-generation.ts` | `buildQuizSystemPrompt()`, `buildQuizUserPrompt(params)` | F2 퀴즈 생성 |
| `coaching.ts` | `buildCoachingSystemPrompt()`, `buildCoachingUserPrompt(params)` | F5 실시간 코칭 |
| `report.ts` | `buildReportSystemPrompt()`, `buildReportUserPrompt(params)` | F7 학습 리포트 |
| `mentor-briefing.ts` | `buildMentorBriefingSystemPrompt()`, `buildMentorBriefingUserPrompt(params)` | F5 멘토 브리핑 |

`mentor-briefing.test.ts`, `report.test.ts` 존재 — 프롬프트 구조 단위 테스트.

## Connections

- [[lib-ai-model]] — upstream: `getModel(purpose)`와 조합하여 AI 호출
- [[lib-ai-schemas]] — sibling: 프롬프트 응답 형식을 Zod 스키마가 검증
- [[api-ai-quiz]] — downstream: `buildQuizSystemPrompt()` + `buildQuizUserPrompt()` 사용
- [[api-ai-coaching]] — downstream: coaching 프롬프트 사용
- [[api-ai-report]] — downstream: report 프롬프트 사용
- [[api-ai-mentor-briefing]] — downstream: mentor-briefing 프롬프트 사용

## Gotchas

- **`existingQuestions` 파라미터**: 같은 세션에서 이전 퀴즈와 중복 방지를 위해 퀴즈 제목 배열을 프롬프트에 삽입. 길어질수록 토큰 소비 증가 — `MAX_QUIZ_COUNT = 5` 제한으로 관리.
- **JSON 응답 강제**: 시스템 프롬프트에 "반드시 아래 JSON 형식으로만 응답하세요"를 명시. 그럼에도 모델이 JSON 외 텍스트를 추가하면 Zod 파싱 실패 → `AI_MAX_RETRY_COUNT = 1` 재시도.
- **few-shot 과목 미매칭 fallback**: `subject`에 알 수 없는 과목명 입력 시 JavaScript `typeof null` 예시가 default로 사용. 새 과목 추가 시 `getFewShotExample()`에 분기 추가 필요.

## Changelog

- 2026-04-11 — `mentor-briefing.ts` 추가 (T4 — F5 멘토 기능)
- 초기 — quiz-generation, coaching, report 프롬프트 작성
