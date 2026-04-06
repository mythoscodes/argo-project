# AI 프롬프트 규칙

## 프롬프트 아키텍처

```
src/lib/ai/
├── model.ts              # 모델 선택 (환경변수 기반)
├── prompts/
│   ├── quiz-generation.ts   # F2: 퀴즈 생성 프롬프트
│   ├── analysis.ts          # F4: 이해도 분석 프롬프트
│   ├── coaching.ts          # F5: 강사 코칭 프롬프트
│   └── report.ts            # F7: 학습 리포트 프롬프트
└── schemas/
    ├── quiz.ts              # 퀴즈 JSON 스키마 (Zod)
    ├── analysis.ts          # 분석 결과 스키마
    ├── coaching.ts          # 코칭 제안 스키마
    └── report.ts            # 리포트 스키마
```

## 프롬프트 작성 원칙

### 시스템 프롬프트 필수 포함 요소
```typescript
const SYSTEM_CONTEXT = `
당신은 코리아IT아카데미(KIT) 교육 AI 어시스턴트입니다.

교육 맥락:
- 수강생: 성인 (취준생, 전직희망자, 직장인). 비전공자~경력자 수준 편차 큼
- 과정: 국비지원 NCS 기반 직업훈련
- 목표: 취업 연계, 수료율 유지, 실무 역량 확보
- 학원: 전국 7개 직영 지점

중요 규칙:
- 한국어로 응답
- 간결하게 (200자 이내, 코칭/리포트)
- 비전공자도 이해할 수 있는 설명 수준
- 실무/취업 면접과 연결되는 포인트 강조
`;
```

### 퀴즈 생성 프롬프트 구조 (F2)
```typescript
export function quizGenerationPrompt(
  topic: string,
  language: string,
  difficulty: 'easy' | 'medium' | 'hard',
  count: number = 5
): string {
  return `
${SYSTEM_CONTEXT}

## 임무
"${topic}" 주제로 ${language} 코드 스니펫 퀴즈 ${count}문항을 생성하세요.

## 퀴즈 유형 (3가지 중 혼합)
1. code_output: "이 코드의 실행 결과는?" + 코드 블록 + 4지선다
2. find_bug: "이 코드의 버그는?" + 코드 블록 + 4지선다
3. fill_blank: 코드에 ___가 있고 빈칸에 들어갈 것 + 4지선다

## 난이도: ${difficulty}
- easy: 기본 문법, 비전공자도 풀 수 있는 수준
- medium: 개념 이해 필요, 중급자 대상
- hard: 엣지 케이스, 경력자도 실수할 수 있는 수준

## 필수 요구사항
- 각 오답에 misconception (학생이 왜 이 오답을 고를 수 있는지) 태그 포함
- 코드 스니펫은 실행 가능한 실제 코드
- 한국어 지문, 코드는 원어 유지
- topic_tag로 세부 개념 분류

## JSON 응답 형식
(Zod 스키마에 맞춰 정확히 출력)
`;
}
```

### 코칭 프롬프트 구조 (F5)
```typescript
export function coachingPrompt(
  topic: string,
  understandingScores: Record<string, number>,
  incorrectPatterns: Array<{ question: string; wrongAnswer: string; count: number }>,
  totalStudents: number
): string {
  return `
${SYSTEM_CONTEXT}

## 임무
강사에게 수업 중 즉시 활용 가능한 코칭을 제안하세요.

## 현재 상황
- 주제: ${topic}
- 수강생: ${totalStudents}명
- 개념별 이해도: ${JSON.stringify(understandingScores)}
- 오답 패턴: ${JSON.stringify(incorrectPatterns)}

## 코칭 규칙
1. 핵심 인사이트 한 문장 먼저
2. 구체적으로 어떤 오해인지 설명
3. 수준별 교수 전략 제안 (비전공자 vs 경력자)
4. 실무/면접 연결 포인트
5. 200자 이내, 간결하게
`;
}
```

## Zod 스키마 예시

### 퀴즈 스키마
```typescript
import { z } from 'zod'

const quizOptionSchema = z.object({
  label: z.enum(['A', 'B', 'C', 'D']),
  text: z.string(),
  is_misconception: z.boolean().optional(),
  misconception: z.string().optional(),
})

const quizItemSchema = z.object({
  question_text: z.string(),
  question_type: z.enum(['code_output', 'find_bug', 'fill_blank']),
  code_snippet: z.string(),
  code_language: z.string(),
  options: z.array(quizOptionSchema).length(4),
  correct_answer: z.enum(['A', 'B', 'C', 'D']),
  topic_tag: z.string(),
  misconception_tags: z.array(z.string()),
})

export const quizResponseSchema = z.object({
  quizzes: z.array(quizItemSchema).min(3).max(5),
})

export type QuizResponse = z.infer<typeof quizResponseSchema>
```

### 코칭 스키마
```typescript
export const coachingResponseSchema = z.object({
  insight: z.string().max(100),          // 핵심 인사이트 한 줄
  weak_concept: z.string(),               // 취약 개념
  misconception_detail: z.string(),        // 오개념 상세
  suggestion_beginner: z.string(),         // 비전공자 대상 제안
  suggestion_advanced: z.string(),         // 경력자 대상 제안
  interview_tip: z.string().optional(),    // 면접 연결 팁
})

export type CoachingResponse = z.infer<typeof coachingResponseSchema>
```

## temperature 가이드

| 기능 | temperature | 이유 |
|------|-------------|------|
| 퀴즈 생성 | `0.3` | 일관된 형식, 정확한 정답, 재현성 |
| 이해도 분석 | `0.2` | 데이터 기반 분석은 결정적이어야 함 |
| 강사 코칭 | `0.5` | 자연스러운 제안, 다양한 교수법 아이디어 |
| 학습 리포트 | `0.5` | 자연스러운 문장, 격려하는 톤 |

## KIT 과정별 코드 언어 매핑

```typescript
export const COURSE_LANGUAGE_MAP: Record<string, string[]> = {
  programming: ['java', 'javascript', 'typescript', 'kotlin', 'sql'],
  security: ['bash', 'python', 'sql'],
  network: ['cisco_ios', 'bash'],
  data_science: ['python', 'r', 'sql'],
  ai_development: ['python', 'javascript'],
  ai_software: ['python', 'bash', 'yaml'],
}
```

## 에러 처리 패턴

```typescript
// AI 응답 파싱 + 재시도
async function generateWithRetry<T>(
  model: LanguageModel,
  prompt: string,
  schema: z.ZodSchema<T>,
  maxRetries = 1
): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const { text } = await generateText({ model, prompt })
      const parsed = schema.safeParse(JSON.parse(text))
      if (parsed.success) return parsed.data
      if (i === maxRetries) throw new Error(`Schema validation failed: ${parsed.error.message}`)
    } catch (e) {
      if (i === maxRetries) throw e
    }
  }
  throw new Error('Unreachable')
}
```
