---
type: screen
id: screen-login
related:
  - "[[lib-supabase-middleware]]"
  - "[[screen-register]]"
  - "[[screen-common-home]]"
  - "[[role-teacher]]"
  - "[[role-student]]"
  - "[[role-mentor]]"
  - "[[role-owner]]"
sources:
  - "src/app/login/page.tsx"
  - "docs/scrum/analysis.md"
updated: 2026-04-11
owner: analyst-2
---

# screen-login — 로그인 화면

## Summary

`/login` 라우트. 이메일/패스워드 Supabase 로그인 후 role에 따라 각 홈으로 리다이렉트. `/register` 링크 포함. 인증된 사용자 접근 시 미들웨어가 `/`으로 리다이렉트.

## Key Claims

- 로그인 성공 후 role 분기: `teacher/owner → /instructor`, `student → /student`, `mentor → /mentor`. (T4에서 mentor 케이스 추가)
- 미인증 사용자의 `/`, `/instructor`, `/student`, `/mentor`, `/owner` 접근은 미들웨어가 `/login`으로 리다이렉트.
- Supabase `supabase.auth.signInWithPassword()` 사용 — 에러 시 "이메일 또는 비밀번호가 올바르지 않습니다" 표시.
- 인증된 사용자가 `/login` 접근 시 미들웨어가 `/`으로 리다이렉트.

## Intuition / Why

role 기반 리다이렉트가 이 화면의 핵심. 같은 로그인 폼이지만 역할에 따라 완전히 다른 대시보드로 진입한다.

## Details

T4 이전: switch에 `case "mentor"` 없음 → mentor 로그인 시 default로 `router.push("/")` → 홈에서 mentor 분기 없어 `/login` 리다이렉트 → 무한 리다이렉트. T4에서 `case "mentor": router.push("/mentor")` 추가.

## Connections

- [[lib-supabase-middleware]] — upstream: 인증된 사용자의 /login 접근을 / 로 리다이렉트
- [[screen-register]] — sibling: 계정 생성 화면
- [[screen-common-home]] — downstream: 로그인 성공 후 role 분기 전 경유 화면
- [[role-mentor]] — see-also: T4에서 mentor 케이스 추가

## Gotchas

- **mentor 무한 리다이렉트 (Cycle 1 회귀)**: T4 이전 mentor login 시 `router.push("/")` → `page.tsx`에도 mentor 분기 없어 `/login` 리다이렉트 → 무한 루프. T4에서 양쪽 모두 수정.

## Changelog

- 2026-04-11 — T4: `case "mentor": router.push("/mentor")` 추가
- 초기 — teacher/student/owner 분기 구현
