---
type: screen
id: screen-common-home
related:
  - "[[screen-login]]"
  - "[[lib-supabase-middleware]]"
  - "[[rls-profiles]]"
  - "[[role-mentor]]"
sources:
  - "src/app/page.tsx"
  - "docs/scrum/analysis.md"
updated: 2026-04-11
owner: analyst-2
---

# screen-common-home — 공통 홈 (역할 분기 리다이렉트)

## Summary

`/` 라우트. 로그인된 사용자의 role을 확인하여 각 대시보드로 리다이렉트하는 Server Component. UI 없이 리다이렉트만 담당. 인증 없으면 미들웨어가 `/login`으로 처리.

## Key Claims

- `switch(profile?.role)`: `owner → /owner`, `teacher → /instructor`, `student → /student`, `mentor → /mentor` 리다이렉트. (T4에서 mentor 케이스 추가)
- `profile`이 null이면 (DB 오류 또는 회원가입 직후) `/login`으로 리다이렉트.
- `default` 케이스도 `/login` 리다이렉트 — 알 수 없는 role 처리.
- Server Component이므로 `redirect()` (next/navigation) 사용 — 클라이언트 `router.push` 아님.

## Intuition / Why

미들웨어가 인증은 처리하지만 role별 라우팅은 하지 않는다. 홈 화면이 role 분기 허브 역할을 한다. UI가 없어도 되는 이유: 사용자는 항상 role에 맞는 화면으로 즉시 이동해야 함.

## Details

T4 이전 mentor 로그인 플로우: login → `/` → switch에 mentor case 없음 → default `/login` → 무한 루프. T4에서 `case "mentor": redirect("/mentor")` 추가.

## Connections

- [[screen-login]] — upstream: 로그인 성공 후 / 경유하거나 직접 대시보드로
- [[lib-supabase-middleware]] — upstream: 미인증 접근을 /login으로 처리
- [[rls-profiles]] — upstream: `profiles.role` 조회로 분기 결정
- [[role-mentor]] — see-also: T4에서 mentor 케이스 추가

## Gotchas

- **T4 이전 mentor 무한 리다이렉트**: `case "mentor"` 없으면 default `/login` → 미들웨어가 인증된 사용자를 `/`으로 → 다시 default `/login` → 무한 루프.

## Changelog

- 2026-04-11 — T4: `case "mentor": redirect("/mentor")` 추가
- 초기 — teacher/student/owner 분기 구현
