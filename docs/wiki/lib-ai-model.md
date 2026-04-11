---
type: lib
id: lib-ai-model
related:
  - "[[lib-ai-prompts]]"
  - "[[lib-constants]]"
  - "[[api-ai-quiz]]"
  - "[[api-ai-mentor-briefing]]"
sources:
  - "src/lib/ai/model.ts"
  - "CLAUDE.md#AI-모델-전환"
  - "CLAUDE.md#AI"
updated: 2026-04-11
owner: analyst-2
---

# lib-ai-model — AI 모델 팩토리 (환경변수 기반 전환)

## Summary

환경변수 `AI_MODEL` 및 용도별 `AI_MODEL_{PURPOSE}` 변수를 읽어 Gemini 3 Flash 또는 Claude Sonnet 4.6 모델 인스턴스를 반환하는 중앙 팩토리. 모든 API Route는 여기서만 모델을 가져온다.

## Key Claims

- `getModel(purpose?)` 하나의 함수가 모든 AI 모델 선택을 담당한다. 다른 파일에서 `createGoogleGenerativeAI` / `createAnthropic` 직접 import 금지 (CLAUDE.md 규칙).
- 용도별 오버라이드: `AI_MODEL_QUIZ`, `AI_MODEL_COACHING`, `AI_MODEL_ANALYSIS`, `AI_MODEL_REPORT`, `AI_MODEL_MENTOR_BRIEFING` — 설정 시 `AI_MODEL` 전역 기본값보다 우선.
- 지원 모델 키: `"gemini-3-flash"` → `"gemini-3-flash-preview"`, `"claude-sonnet"` → `"claude-sonnet-4-6"`. 다른 값은 `MODEL_ID_MAP`에 없어 기본 Gemini로 fallback.
- 환경변수에 유효하지 않은 값을 넣으면 silently Gemini로 fallback한다 (`in MODEL_ID_MAP` 체크).
- 기본값: `process.env.AI_MODEL ?? "gemini-3-flash"`.

## Intuition / Why

공모전 데모 환경에서는 Gemini 3 Flash(무료)를 기본으로, 품질이 중요한 퀴즈/리포트에서는 Claude Sonnet(유료)으로 전환하는 하이브리드 운용을 지원한다. 모델 전환을 코드 수정 없이 환경변수로만 가능하게 하려면 중앙 팩토리가 필수.

CLAUDE.md "AI 모델 전환" 섹션의 옵션 A(Gemini 기본) / 옵션 C(Claude 최우선) / 옵션 B(하이브리드)를 이 파일이 구현한다.

## Details

```ts
// 용도별 환경변수 → 전역 기본값 순서로 resolve
function resolveModelKey(purpose?: ModelPurpose): ModelKey {
  if (purpose) {
    const purposeModel = process.env[ENV_KEY_MAP[purpose]] as ModelKey | undefined;
    if (purposeModel && purposeModel in MODEL_ID_MAP) return purposeModel;
  }
  return (process.env.AI_MODEL ?? "gemini-3-flash") as ModelKey;
}
```

새 모델 추가 시: `MODEL_ID_MAP`에 키/값 추가 + `ModelKey` 타입 자동 확장.

## Connections

- [[lib-ai-prompts]] — downstream: 프롬프트 파일이 이 `getModel()`과 조합되어 AI 호출
- [[lib-constants]] — see-also: AI 온도 상수(`AI_TEMPERATURE_*`)를 `getModel()` 호출부에서 함께 사용
- [[api-ai-quiz]] — downstream: `getModel("quiz")`로 퀴즈 생성 모델 조회
- [[api-ai-mentor-briefing]] — downstream: `getModel("mentor-briefing")`으로 브리핑 모델 조회

## Gotchas

- **환경변수 오타 시 silent Gemini fallback**: `AI_MODEL=gemiini-3-flash` (오타) 입력 시 `MODEL_ID_MAP`에 없어 기본 Gemini로 fallback — 에러 없이 조용히 다른 모델로 동작. 배포 후 반드시 모델 실제 사용 여부 로그 확인 필요.
- **서버사이드 전용**: `getModel()`은 API Route에서만 호출 가능. `GOOGLE_GENERATIVE_AI_API_KEY`/`ANTHROPIC_API_KEY`는 서버사이드 전용 비밀키 (CLAUDE.md 규칙 #1).
- **`"gemini-3-flash-preview"`**: 실제 Gemini 3 Flash 모델 ID. 프리뷰 딱지가 붙어 있어 GA 출시 시 모델 ID 변경 필요.

## Changelog

- 2026-04-11 — `"mentor-briefing"` purpose 추가 (T4). `ENV_KEY_MAP` + `MODEL_ID_MAP` 확장.
- 초기 — quiz/coaching/analysis/report 4개 purpose 지원
