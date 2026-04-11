---
type: api
id: api-auth-register
related:
  - "[[screen-register]]"
  - "[[rls-profiles]]"
  - "[[role-mentor]]"
sources:
  - "src/app/api/auth/register/route.ts"
  - "docs/scrum/analysis.md"
  - "supabase/migrations/00007_add_mentor_role.sql"
updated: 2026-04-11
owner: analyst-2
---

# api-auth-register — POST /api/auth/register

## Summary

신규 사용자 계정 생성 Route Handler. Supabase `auth.admin.createUser()` 또는 `auth.signUp()`으로 auth.users 생성 후 `profiles` 테이블에 역할/학원 정보를 INSERT한다.

## Key Claims

- Zod 스키마: `role: z.enum(["teacher", "student", "owner", "mentor"])` — T4에서 mentor 추가. mentor 없이는 400 반환.
- 응답: `{ user_id, role }` — `join_code` 미포함 (보안 — 가입 응답에 join_code 불필요).
- `academy_id` 처리: 학원코드 제공 시 기존 학원 조회, 없으면 신규 학원 생성 (원장 role).
- `profiles` INSERT: `id = auth.uid()`, `academy_id`, `role`, `display_name` 필수.

## Intuition / Why

회원가입 시 `auth.users`와 `profiles` 두 테이블에 동시 삽입이 필요하다. `auth.users`는 Supabase Auth 관리, `profiles`는 역할/학원 정보를 담는 애플리케이션 테이블. 두 INSERT가 모두 성공해야 정상 계정.

## Details

T4 이전: Zod enum `["teacher", "student", "owner"]` → mentor POST 시 400. T4: "mentor" 추가 + DB CHECK (00007) 동시 적용.

**TC 파일**: `[[docs/tc/common-auth.md]]`

## Connections

- [[screen-register]] — downstream: 이 API를 호출하는 가입 폼
- [[rls-profiles]] — upstream: profiles INSERT — academy_id 필수
- [[role-mentor]] — see-also: T4에서 mentor 가입 지원 추가

## Gotchas

- **profiles INSERT 실패 시 auth.users 롤백**: auth.users 생성 후 profiles INSERT 실패 시 고아 auth.users 레코드가 남을 수 있다. 트랜잭션 처리 또는 삭제 로직 필요.
- **join_code 응답 미포함**: 분석 단계에서 "join_code 노출 없음"이 PASS — 가입 응답에 join_code가 포함될 이유가 없으나, 코드 변경 시 응답 구조 주의.

## Changelog

- 2026-04-11 — T4: Zod enum에 "mentor" 추가
- 초기 — teacher/student/owner 가입 구현
