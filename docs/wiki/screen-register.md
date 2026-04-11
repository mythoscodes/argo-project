---
type: screen
id: screen-register
related:
  - "[[api-auth-register]]"
  - "[[screen-login]]"
  - "[[rls-profiles]]"
  - "[[role-mentor]]"
sources:
  - "src/app/register/page.tsx"
  - "src/app/api/auth/register/route.ts"
  - "docs/scrum/analysis.md"
updated: 2026-04-11
owner: analyst-2
---

# screen-register — 회원가입 화면

## Summary

`/register` 라우트. 이름, 이메일, 패스워드, role 선택, 학원코드를 입력하여 계정을 생성. `POST /api/auth/register` 호출 후 role에 따라 각 대시보드로 이동.

## Key Claims

- `ROLE_OPTIONS`: `[teacher, student, owner, mentor]` — T4에서 mentor 추가.
- 가입 성공 후 role 분기: `mentor → /mentor`, 나머지 기존 분기 유지.
- `POST /api/auth/register` Zod 검증: `role: z.enum(["teacher", "student", "owner", "mentor"])` — T4에서 mentor 추가.
- 학원코드 미입력 시 새 학원 생성 또는 에러 — 정책 확인 필요.

## Intuition / Why

신규 사용자가 학원 코드로 기존 학원에 합류하거나, 원장이 새 학원을 생성하는 온보딩 화면.

## Details

T4 이전: `ROLE_OPTIONS`에 mentor 없음 → 화면에서 mentor 선택 불가. API Zod enum에도 없음 → POST 시 400. DB CHECK에도 없음 → INSERT 실패 (3중 차단).

**TC 파일**: `[[docs/tc/common-auth.md]]` (공용 인증 TC)

## Connections

- [[api-auth-register]] — upstream: 회원가입 POST 처리
- [[screen-login]] — sibling: 기존 계정 로그인
- [[rls-profiles]] — downstream: 가입 후 profiles INSERT — `academy_id` 연결 필수
- [[role-mentor]] — see-also: T4에서 mentor role 가입 지원 추가

## Gotchas

- **3중 차단 (T4 이전)**: UI 옵션 없음 + API Zod enum 없음 + DB CHECK 없음 → mentor 계정 생성 완전 불가. T4에서 모두 수정 (00007 마이그레이션 포함).
- **가입 직후 profiles null**: `auth.users` INSERT 직후 `profiles` INSERT 전 시점에 `/` 접근 시 profile null → `/login` 리다이렉트. 회원가입 API가 트랜잭션 내에서 profiles도 INSERT해야 함.

## Changelog

- 2026-04-11 — T4: `ROLE_OPTIONS`에 mentor 추가, 가입 후 mentor → `/mentor` 리다이렉트 추가
- 초기 — teacher/student/owner 회원가입 구현
