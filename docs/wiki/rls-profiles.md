---
type: rls
id: rls-profiles
related:
  - "[[rls-sessions]]"
  - "[[rls-consultation-notes]]"
  - "[[lib-supabase-server]]"
  - "[[concept-academy-isolation]]"
  - "[[role-mentor]]"
sources:
  - "supabase/migrations/00001_initial_schema.sql"
  - "supabase/migrations/00006_fix_profiles_rls_recursion.sql"
  - "supabase/migrations/00007_add_mentor_role.sql"
  - "docs/scrum/e2e-results.md#Issue-1"
updated: 2026-04-11
owner: analyst-2
---

# rls-profiles — profiles 테이블 RLS 정책

## Summary

수강생/강사/멘토/원장 프로필을 담는 `profiles` 테이블의 RLS 정책. 핵심 변천: 초기 서브쿼리 방식이 무한 재귀를 일으켜 `SECURITY DEFINER` 함수(`get_my_academy_id()`)로 교체.

## Key Claims

- `profiles` 테이블에는 `profiles_select_same_academy`(SELECT)와 `profiles_update_own`(UPDATE) 두 개 정책만 존재한다. (`00006` 마이그레이션 기준)
- 초기(00001) `profiles_select_same_academy`는 `academy_id IN (SELECT academy_id FROM profiles WHERE id = auth.uid())` 서브쿼리 — profiles 자기 참조 → RLS 재적용 → 무한 재귀 발생.
- `00006` 마이그레이션 후 `profiles_select_same_academy`는 `academy_id = get_my_academy_id()` — SECURITY DEFINER 함수로 RLS 우회하여 재귀 제거.
- `profiles.role CHECK`는 `00001`에서 `('owner', 'teacher', 'student')`였고, `00007`에서 `'mentor'` 추가.
- `get_my_academy_id()` / `get_my_role()`는 `SECURITY DEFINER` + `STABLE` + `SET search_path = public` — 호출자 RLS가 아닌 함수 소유자 권한으로 실행.

## Intuition / Why

모든 테이블의 RLS 격리가 `academy_id = get_my_academy_id()`를 통과해야 하는데, `get_my_academy_id()` 자체가 `profiles` 테이블을 SELECT한다. 일반 SQL 함수라면 호출 시 프로필 테이블 RLS가 재적용 → 그 RLS가 다시 `get_my_academy_id()`를 호출 → 무한 재귀. `SECURITY DEFINER`로 이 순환을 끊는다.

`00007`에서 mentor role 추가는 DB CHECK 제약 교체 방식을 썼다. `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT` — 무중단이지만 기존 데이터에 mentor 값이 없어서 데이터 마이그레이션은 불필요.

## Details

```sql
-- 00006 핵심: SECURITY DEFINER 함수 (RLS 재귀 방지)
CREATE OR REPLACE FUNCTION get_my_academy_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT academy_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- profiles SELECT 정책 (00006 교체 후)
CREATE POLICY "profiles_select_same_academy" ON profiles
  FOR SELECT USING (academy_id = get_my_academy_id());

-- 00007: mentor role 추가
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'teacher', 'student', 'mentor'));
```

`profiles_update_own`은 `id = auth.uid()`만 사용 — profiles 자기 참조 없어서 재귀 없음, 유지.

## Connections

- [[rls-sessions]] — sibling: sessions RLS도 `get_my_academy_id()` 사용. profiles 정책 변경 시 연동 확인
- [[rls-consultation-notes]] — downstream: consultation_notes INSERT에 `get_my_role()` 사용 — mentor role 추가(00007)가 영향
- [[lib-supabase-server]] — upstream: Server Component 클라이언트가 이 RLS를 통과하여 profiles 조회
- [[concept-academy-isolation]] — see-also: academy_id 기반 격리 원칙의 핵심 구현 대상
- [[role-mentor]] — see-also: 00007에서 mentor role이 profiles CHECK에 추가된 배경

## Gotchas

- **원격 DB 미적용 (Cycle 1 Issue 1)**: `00006` 마이그레이션을 로컬에만 적용하고 원격 Supabase DB에 미적용 상태였다. 결과: 모든 인증 후 API 호출 500 에러, 홈 `/` 접속 시 `ERR_TOO_MANY_REDIRECTS`. MCP `apply_migration`으로 원격에 수동 적용 후 해소. E2E 테스트 26/26 PASS 확인.
- **00006에서 consultation_notes INSERT role 체크 제거 (회귀)**: `00006`의 `consultation_notes_insert` 정책에서 role 체크를 실수로 누락했다. 결과: `instructor_id = auth.uid()`만 있어 student도 삽입 가능. `00007`에서 `get_my_role() IN ('owner', 'teacher', 'mentor')` 복원.
- **`get_my_academy_id()` 반환값 NULL**: 프로필이 없는 `auth.uid()`(예: 회원가입 직후 profiles INSERT 전)는 NULL 반환 → 모든 RLS가 FALSE. 회원가입 API에서 `profiles INSERT`가 `auth.users INSERT` 직후 트랜잭션 내에서 완료되어야 한다.

## Changelog

- 2026-04-11 — 00007: profiles.role CHECK에 'mentor' 추가 (analyst-2)
- 2026-04-11 — 00006: `profiles_select_same_academy`를 SECURITY DEFINER 함수 기반으로 교체, 무한 재귀 수정 (Cycle 1 Issue 1)
- 초기 — 00001: `profiles` 테이블 생성, 기본 SELECT/UPDATE RLS
