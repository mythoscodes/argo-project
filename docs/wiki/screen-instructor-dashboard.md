---
type: screen
id: screen-instructor-dashboard
related:
  - "[[api-sessions]]"
  - "[[screen-instructor-session-new]]"
  - "[[screen-instructor-session-detail]]"
  - "[[feature-f1-session]]"
  - "[[role-teacher]]"
sources:
  - "src/app/instructor/page.tsx"
  - "docs/tc/instructor-dashboard.md"
updated: 2026-04-11
owner: analyst-2
---

# screen-instructor-dashboard — 강사 대시보드

## Summary

`/instructor` 라우트. 강사의 세션 목록(진행 중/종료/draft)을 표시하고, 새 세션 생성 버튼으로 `/instructor/sessions/new`로 이동하는 메인 화면.

## Key Claims

- `GET /api/sessions` — teacher_id = auth.uid() 기반 본인 세션 목록.
- draft/active/ended 상태별 필터 탭 표시 가능.
- instructor layout guard: Server Component에서 `auth.getUser()` + `profiles.role` — teacher/owner가 아니면 각 홈으로 리다이렉트. (T4-hotfix에서 추가)
- E2E 테스트 IDB-UI-001: 강사 대시보드 렌더링 확인 (26/26 PASS).

## Intuition / Why

F1 세션관리의 시작점. 강사가 매 수업 전 새 세션을 만들고, 이전 세션 이력을 확인하는 허브 화면.

## Details

세션 카드: 제목, 과목, 상태 배지, 참여자 수, 생성일. active 세션은 "진행 중" 강조.

**TC 파일**: `[[docs/tc/instructor-dashboard.md]]`

## Connections

- [[api-sessions]] — upstream: 세션 목록 GET
- [[screen-instructor-session-new]] — downstream: "새 세션" 버튼
- [[screen-instructor-session-detail]] — downstream: 세션 카드 클릭
- [[feature-f1-session]] — implements: F1 세션관리 강사 뷰
- [[role-teacher]] — implements: teacher role 주 화면

## Gotchas

- **instructor layout guard 미구현 (T4-hotfix 이전)**: T4에서 모든 layout에 role guard 일괄 추가. 이전에는 mentor/student도 `/instructor` 접근 가능했음.

## Changelog

- 2026-04-11 — T4-hotfix: instructor layout.tsx role guard 추가
- 초기 — 강사 대시보드 기본 구현
