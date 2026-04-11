---
type: feature
id: feature-f7-report
related:
  - "[[concept-understanding-score]]"
  - "[[concept-session]]"
  - "[[lib-ai-prompts]]"
  - "[[lib-ai-schemas]]"
  - "[[feature-f6-feedback-loop]]"
  - "[[role-teacher]]"
  - "[[role-student]]"
sources:
  - "src/app/api/ai/report/route.ts"
  - "src/lib/ai/prompts/report.ts"
  - "src/lib/ai/schemas/report.ts"
  - "src/lib/constants.ts#AI_TEMPERATURE_REPORT"
  - "supabase/migrations/00001_initial_schema.sql#student_reports"
  - "docs/tc/instructor-session-reports.md"
updated: 2026-04-11
owner: planner
---

# F7: Student Report (수강생 리포트)

## Summary

세션 종료 후 AI가 수강생별 이해도 요약·약점 토픽·학습 추천을 생성해 `student_reports` 테이블에 저장하는 기능. `POST /api/ai/report`가 생성, `GET /api/ai/report`가 조회. CLAUDE.md P1(데모 권장) 우선순위.

## Key Claims

- `POST /api/ai/report`는 `teacher/owner/mentor` role에 허용된다; 학원 격리(academy_id)를 통해 타 학원 리포트 생성 차단 — `src/app/api/ai/report/route.ts`
- `studentId`를 지정하면 특정 수강생 리포트, 미지정 시 세션 전체 수강생 리포트를 일괄 생성한다
- AI 생성 시 `temperature: AI_TEMPERATURE_REPORT (0.5)` — 리포트는 자연스러운 서술과 다양한 추천 표현이 필요 — `route.ts` L46-47
- 생성 결과를 `student_reports` 테이블에 저장하며, `report_type='session'`으로 기록된다
- `GET /api/ai/report`는 teacher/owner/mentor/student 모두 접근 가능하나, student는 자신의 리포트만 조회 가능(RLS)

## Intuition / Why

KIT 직업훈련에서 수강생은 "내가 이 수업에서 무엇을 배웠고, 어디가 부족한가"를 알고 싶다. AI가 이해도 데이터를 토대로 개인화된 학습 가이드를 자동 생성하면 강사의 추가 작업 없이 수강생 별 피드백이 가능하다.

## Details

### 리포트 생성 흐름

```
POST /api/ai/report { sessionId, studentId? }
  → role 확인 + academy_id 격리
  → 해당 수강생 응답 데이터 + analysis_results 조회
  → 토픽별 점수, 총 문제/정답 수, 약점 토픽 계산
  → buildReportSystemPrompt() + buildReportUserPrompt(params)
  → generateText(temperature=0.5) → Zod 검증
  → student_reports INSERT
  → 201: { data }
```

### reportResponseSchema 구조

- `overallScore`: 전체 정답률 (0~100)
- `summary`: 이번 수업 요약 서술
- `topicBreakdown`: 토픽별 점수 + 피드백
- `strengths`: 잘한 부분 배열
- `weaknesses`: 약점 배열
- `studyRecommendations`: 학습 추천 배열

## Connections

- [[concept-understanding-score]] — upstream: 토픽별 점수가 리포트 입력 데이터
- [[concept-session]] — upstream: 세션 단위로 리포트가 생성
- [[lib-ai-prompts]] — uses: `report.ts`의 buildReportSystemPrompt/buildReportUserPrompt
- [[lib-ai-schemas]] — uses: `report.ts`의 reportResponseSchema
- [[feature-f6-feedback-loop]] — upstream: 피드백 루프 완료 후 최종 리포트 생성 흐름
- [[role-teacher]] — upstream: 강사가 리포트 생성 트리거
- [[role-student]] — downstream: 수강생이 자신의 리포트 조회

## Gotchas

- **mentor의 POST 허용**: mentor가 report 생성을 트리거할 수 있다. 수업 담당 강사의 의도와 다를 수 있으므로 mentor 생성 이력 구분이 필요할 수 있다.
- **`student_reports` academy_id**: `student_reports` INSERT RLS가 `academy_id = get_my_academy_id() AND get_my_role() IN ('owner', 'teacher')`이므로 mentor는 RLS INSERT 차단될 수 있다 — `migrations/00006` L154-158. mentor의 POST 허용 정책과 RLS 정책 간 불일치 확인 필요.

## Changelog

- 2026-04-11 — 초판 작성 (planner)
