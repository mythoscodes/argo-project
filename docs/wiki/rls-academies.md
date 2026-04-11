---
type: rls
id: rls-academies
related:
  - "[[rls-profiles]]"
  - "[[concept-academy-isolation]]"
  - "[[api-auth-register]]"
sources:
  - "supabase/migrations/00001_initial_schema.sql"
  - "supabase/migrations/00006_fix_profiles_rls_recursion.sql"
updated: 2026-04-11
owner: analyst-2
---

# rls-academies — academies 테이블 RLS 정책

## Summary

학원 정보를 담는 `academies` 테이블의 RLS. 자신이 속한 학원만 조회 가능. `get_my_academy_id()` 함수로 무한 재귀 없이 격리.

## Key Claims

- SELECT: `id = get_my_academy_id()` — 본인 학원만 조회 가능. 타 학원 정보 미노출.
- 초기(00001): `id IN (SELECT academy_id FROM profiles WHERE id = auth.uid())` — profiles 자기 참조 → 무한 재귀 잠재 위험 (profiles RLS가 academies를 참조하면 루프).
- 00006에서 `id = get_my_academy_id()` SECURITY DEFINER 함수로 교체 — 재귀 방지.
- INSERT/UPDATE/DELETE: 별도 정책 없음 — 기본 DENY (일반 사용자는 학원 직접 수정 불가).

## Intuition / Why

학원 데이터는 가입 시 생성(원장 role)되거나 기존 학원 코드로 조회된다. 가입 후에는 API Route가 academy_id를 통해 간접 접근하므로 academies 직접 수정 권한은 불필요.

## Details

초기 정책에서 `profiles → academies → profiles → ...` 참조 루프 가능성: `profiles SELECT`가 `academy_id IN (SELECT academy_id FROM profiles)` 서브쿼리 → `academies SELECT`가 `id IN (SELECT academy_id FROM profiles)` → profiles RLS 재적용... 실제로 무한 재귀가 발생했던 것은 profiles 정책이었지만, academies도 동일 서브쿼리 패턴 → 00006에서 함께 교체.

## Connections

- [[rls-profiles]] — upstream: `get_my_academy_id()` 함수 사용 (00006 정의)
- [[concept-academy-isolation]] — see-also: academy_id 격리 원칙 전반
- [[api-auth-register]] — downstream: 가입 시 academies INSERT (신규 학원 생성)

## Gotchas

- **INSERT 정책 없음**: academies INSERT는 Supabase service_role(SUPERUSER)로만 가능. 가입 API(`/api/auth/register`)가 service_role 키를 사용하거나 별도 INSERT 정책이 필요.
- **학원 이름 변경**: UPDATE 정책이 없으므로 현재 학원 이름 변경 기능 구현 불가 — 필요 시 정책 추가 필요.

## Changelog

- 2026-04-11 — 00006: `get_my_academy_id()` 기반으로 정책 교체 (무한 재귀 방지)
- 초기 — 00001: 기본 academies SELECT RLS
