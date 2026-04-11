---
type: api
id: api-ai-report
related:
  - "[[lib-ai-prompts]]"
  - "[[lib-ai-schemas]]"
  - "[[lib-ai-model]]"
  - "[[lib-constants]]"
  - "[[screen-student-report]]"
  - "[[rls-responses]]"
sources:
  - "src/app/api/ai/report/route.ts"
updated: 2026-04-11
owner: analyst-2
---

# api-ai-report — GET/POST /api/ai/report

## Summary

수강생 개인 세션 리포트를 AI로 생성하고 `student_reports` 테이블에 저장. 강사는 `studentId` 지정 필수, 수강생은 본인만. GET은 저장된 리포트 조회.

## Key Claims

- POST Zod: `{ sessionId, studentId?: uuid }`.
- staff (owner/teacher/mentor): `studentId` 필수 → 미지정 시 400.
- 수강생: `targetStudentId = user.id` (studentId 파라미터 무시).
- 강사는 `session.teacher_id === user.id` 확인 — 타인 세션의 수강생 리포트 생성 불가.
- 수강생은 `session_participants` 참여 여부 확인 → 403.
- `weakTopics`: `score <= WEAK_TOPIC_THRESHOLD(60)`.
- AI 실패 시 1회 재시도, 502.
- 저장: `student_reports` 테이블 (`report_type="session"`).
- GET `?sessionId&studentId?`: staff는 세션 전체 또는 특정 수강생, student는 본인.

## Intuition / Why

세션 종료 후 강사가 수강생별 리포트를 생성해주거나 수강생이 직접 조회. mentor도 staff로 취급해 열람 가능 (N-3 critic 지적).

## Details

```ts
// temperature: 0.5 — 리포트는 자연스러운 서술과 다양한 추천 표현이 필요
temperature: AI_TEMPERATURE_REPORT,
output: Output.object({ schema: reportResponseSchema }),
```

저장 필드: `understanding_summary` (reportResult.data as Json), `weak_topics` (string[] as Json), `recommendations` (배열 join "\n").

## Connections

- [[lib-ai-prompts]] — upstream: buildReportSystemPrompt(), buildReportUserPrompt()
- [[lib-ai-schemas]] — upstream: reportResponseSchema (overallScore, topicResults, weakTopics, recommendations)
- [[lib-ai-model]] — upstream: getModel("report")
- [[lib-constants]] — upstream: AI_TEMPERATURE_REPORT, WEAK_TOPIC_THRESHOLD
- [[screen-student-report]] — downstream: 수강생 리포트 화면에서 GET 조회
- [[rls-responses]] — upstream: 수강생 응답 데이터 집계 (topic별 정답률)

## Gotchas

- **mentor는 staff 취급**: `isStaff = ["owner","teacher","mentor"].includes(role)` — mentor도 studentId 필수, 세션 소유권 체크 없음.
- **recommendations 저장 방식**: `배열.join("\n")` — 조회 시 줄바꿈 split이 필요하거나 프론트가 string으로 처리.
- **understanding_summary as Json**: `reportResult.data as unknown as Json` — Supabase Json 타입과 ReportResponse 타입 불일치 시 런타임 저장 오류 가능.

## Changelog

- 초기 — POST/GET /api/ai/report 구현 (staff/student 분기, mentor staff 포함, 1회 retry)
