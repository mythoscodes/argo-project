---
type: screen
id: screen-student-result
related:
  - "[[screen-student-session]]"
  - "[[screen-student-report]]"
  - "[[rls-responses]]"
  - "[[feature-f3-response-collection]]"
sources:
  - "src/app/student/sessions/[id]/result/page.tsx"
  - "docs/tc/student-result.md"
updated: 2026-04-11
owner: analyst-2
---

# screen-student-result — 수강생 퀴즈 결과

## Summary

`/student/sessions/[id]/result` 라우트. 문항별 정답/오답 비교, 총 정답률 트로피, 등급 배지를 표시하는 정적 결과 화면. Realtime 없음 — 세션 종료 후 1회 페칭.

## Key Claims

- 등급 기준: ≥ 80% → "우수" success 배지, 60-80% → "보통" warning 배지, < 60% → "복습 필요" destructive 배지.
- `scorePercent = 0` 시 NaN 방어 필요 (`totalCount = 0`이면 0/0 = NaN 가능).
- `GET /api/responses?sessionId` 응답에 본인 응답만 포함 (RLS `responses_select_same_academy` + student_id 필터).
- 타 수강생 응답 격리: RLS로 A의 `responses`에서 B의 응답 미노출.
- `"학습 리포트 보기"` 버튼 → `/student/sessions/[id]/report`로 이동.

## Intuition / Why

퀴즈 제출 직후 즉각적인 피드백. 정답률·등급·문항별 정오답 대조로 수강생이 자신의 이해도를 파악한다. 리포트 화면은 AI가 분석하는 깊은 피드백 — 결과 화면은 즉각, 리포트는 심화.

## Details

정오답 표시: 정답 문항 `CheckCircle2` 초록 아이콘 + 정답 보기 초록 배경. 오답 문항 `XCircle` 빨강 아이콘 + 내 답 빨강 + 정답 초록. `response_time_ms`가 있으면 "12.3초" 형식 표시.

**TC 파일**: `[[docs/tc/student-result.md]]` — 67개 TC (SSR-UI-001~012, SSR-API-001~004, SSR-ERR-001~006, SSR-BND-001~010, SSR-AUTH-001~005, SSR-NET-001~005, SSR-A11Y-001~005, SSR-KO-001~004, SSR-RLS-001~005, SSR-SEC-001~004, SSR-RL-001~002, SSR-NAV-001~005)

## Connections

- [[screen-student-session]] — upstream: 세션 제출 후 이 화면으로 이동
- [[screen-student-report]] — downstream: "학습 리포트 보기" 버튼으로 이동
- [[rls-responses]] — upstream: 본인 응답만 반환하는 RLS
- [[feature-f3-response-collection]] — implements: F3 결과 뷰

## Gotchas

- **NaN 방어**: `totalCount = 0` 상태에서 `correctCount / totalCount * 100`은 NaN → `scorePercent = 0`으로 기본값 처리 필요.
- **`quiz`가 `responses`에 없는 경우**: 퀴즈가 삭제된 경우 `quiz?.question_text ?? ""` fallback — 빈 카드 렌더, 크래시 없음.

## Changelog

- 2026-04-11 — 초판 작성 (analyst-2)
- 초기 — 수강생 결과 화면 기본 구현
