---
type: api
id: api-ai-mentor-briefing
related:
  - "[[api-mentor-students-id]]"
  - "[[lib-ai-prompts]]"
  - "[[lib-ai-schemas]]"
  - "[[lib-ai-model]]"
  - "[[lib-constants]]"
  - "[[screen-mentor-student-detail]]"
sources:
  - "src/app/api/ai/mentor-briefing/route.ts"
  - "docs/scrum/dev-changelog.md#T4"
  - "docs/tc/mentor-student-detail.md#MSD-API-004"
updated: 2026-04-11
owner: analyst-2
---

# api-ai-mentor-briefing — POST /api/ai/mentor-briefing

## Summary

멘토가 수강생 상담 전 AI 브리핑을 요청하는 엔드포인트. 수강생의 위험도·정답률·취약 토픽 데이터를 기반으로 `talking_points`, `weakness_analysis`, `recommended_strategy`, `recommended_courses?`를 생성한다.

## Key Claims

- 인가: `get_my_role() IN ('owner', 'teacher', 'mentor')` — T4에서 mentor 추가 (N-1).
- AI 응답 Zod 검증: `talking_points: string[]` 필수. 실패 시 1회 재시도 (`AI_MAX_RETRY_COUNT = 1`).
- `RISK_SPEED_INCREASE_RATIO` 상수 파생 동적 문자열: `"30%"` 매직 넘버 → `((RISK_SPEED_INCREASE_RATIO - 1) * 100).toFixed(0) + "%"` (N-6).
- 응답 형태: `snake_case MentorBriefing` — 프론트 타입과 일치.
- `recommended_courses`는 optional — null/빈 배열 시 프론트에서 섹션 미노출.

## Intuition / Why

멘토가 수강생 상담 전 5분 만에 핵심 맥락(위험 신호, 약점, 추천 접근)을 파악하도록 돕는다. AI가 수강생 데이터를 종합하여 상담 포인트를 bullet로 제시.

## Details

프롬프트 파일: `src/lib/ai/prompts/mentor-briefing.ts`. 모델: `getModel("mentor-briefing")` → `AI_MODEL_MENTOR_BRIEFING` 환경변수 또는 기본 Gemini.

Zod 스키마: `src/lib/ai/schemas/mentor-briefing.ts`.

## Connections

- [[api-mentor-students-id]] — upstream: 수강생 상세 데이터(risk + history + weak_topics)를 이 API의 AI 프롬프트 입력으로 활용
- [[lib-ai-prompts]] — upstream: `buildMentorBriefingSystemPrompt()` + `buildMentorBriefingUserPrompt()`
- [[lib-ai-schemas]] — upstream: `mentorBriefingSchema` Zod 검증
- [[lib-ai-model]] — upstream: `getModel("mentor-briefing")`
- [[lib-constants]] — upstream: `RISK_SPEED_INCREASE_RATIO`, `AI_MAX_RETRY_COUNT`
- [[screen-mentor-student-detail]] — downstream: 브리핑 버튼 클릭 시 이 API 호출

## Gotchas

- **T4 이전 mentor 403**: `!["owner","teacher"].includes(profile.role)` → mentor 제외. T4에서 수정 (N-1).
- **`"30%"` 매직 넘버 (N-6)**: AI 프롬프트에 하드코딩된 `"30%"` 문자열이 `RISK_SPEED_INCREASE_RATIO`와 불일치 위험. 상수화 후 동적 파생으로 수정.
- **브리핑 더블클릭**: 클라이언트에서 버튼 disabled 처리 없으면 AI API 중복 호출. MSD-RL-001 TC.

## Changelog

- 2026-04-11 — T4: mentor role 허용, RISK_SPEED_INCREASE_RATIO 동적 문자열, snake_case 응답 변환 (N-1, N-6, N-8)
- 초기 — owner/teacher 전용 멘토 브리핑 구현
