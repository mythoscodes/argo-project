---
type: feature
id: feature-f8-owner-dashboard
related:
  - "[[concept-risk-signal]]"
  - "[[concept-academy-isolation]]"
  - "[[feature-f7-report]]"
  - "[[role-owner]]"
  - "[[role-mentor]]"
sources:
  - "src/app/api/mentor/students/route.ts"
  - "src/app/api/mentor/students/[id]/route.ts"
  - "src/app/owner/page.tsx"
  - "src/app/mentor/page.tsx"
  - "docs/tc/owner-dashboard.md"
updated: 2026-04-11
owner: planner
---

# F8: Owner/Mentor Dashboard (원장·멘토 대시보드)

## Summary

원장(owner)과 멘토(mentor)가 학원 전체 수강생의 이탈 위험도를 한눈에 파악하는 대시보드. `GET /api/mentor/students`가 위험 신호를 계산해 HIGH→MEDIUM→LOW 순으로 반환한다. CLAUDE.md P2(MVP 제외, 보너스) 우선순위이나 구현 완료 상태.

## Key Claims

- `GET /api/mentor/students`는 `teacher/owner/mentor` role에 허용되며, mentor는 academy_id 기준 전체 세션, teacher는 본인 세션 수강생만 분석한다 — `src/app/api/mentor/students/route.ts` L54-69
- 반환 데이터는 `risk_level` 기준 HIGH→MEDIUM→LOW 정렬 — `route.ts` L276-278
- `GET /api/mentor/students/[id]`는 특정 수강생의 상세 위험 신호와 상담 이력을 반환한다
- KPI 집계(전체 세션 수, 평균 이해도, 위험 수강생 수)가 owner 대시보드에 표시된다 — `src/app/owner/page.tsx`

## Intuition / Why

원장은 30명 수강생 중 "지금 누가 이탈 직전인가"를 알고 mentor에게 상담을 배정해야 한다. mentor는 배정받은 수강생의 학습 이력과 최근 위험 신호를 미리 파악한 후 상담에 임한다.

## Connections

- [[concept-risk-signal]] — implements: F8이 위험 신호 계산·표시 end-to-end 구현
- [[concept-academy-isolation]] — upstream: F8의 데이터 범위가 academy_id RLS로 제한
- [[feature-f7-report]] — see-also: 수강생 상세 페이지에서 F7 리포트 링크
- [[role-owner]] — upstream: owner가 F8 대시보드의 주 사용자 (학원 전체 뷰)
- [[role-mentor]] — upstream: mentor가 F8에서 상담 대상 수강생을 식별

## Gotchas

- **응답 속도 신호 방향 이슈**: `speedSignal` 조건이 최신 세션이 이전 세션보다 빠른 경우 triggered인데, 주석은 "30% 증가"라고 설명한다. 빠른 응답이 찍기 패턴을 의미하는 의도는 맞으나 "증가"와 "빠름"의 언어 혼용이 오해 유발 — `route.ts` L188-189.

## Changelog

- 2026-04-11 — 초판 작성 (planner)
