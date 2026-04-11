# E2E 테스트 결과 보고서

**실행일시**: 2026-04-11  
**실행자**: qa (T7)  
**총 소요시간**: 24.1s (최초) / 24.7s (dev-2 변경 후 재실행)  
**결과**: ✅ 26/26 PASS (2회 연속)

---

## 요약

| 항목 | 수치 |
|------|------|
| 전체 테스트 수 | 26 |
| PASS | 26 |
| FAIL | 0 |
| SKIP | 0 |
| 소요시간 | 24.1s |

---

## Spec별 결과

### `01-mentor-auth.spec.ts` — 9/9 PASS

| # | 테스트명 | AC | 결과 | 비고 |
|---|----------|----|------|------|
| 1 | mentor 계정으로 / 접속 → /mentor 리다이렉트 (AC-1) | CMN-UI-002 | ✅ PASS | |
| 2 | /mentor 대시보드 렌더링 확인 (AC-2) | MNT-UI-001 | ✅ PASS | |
| 3 | mentor → /instructor 접근 시 리다이렉트 (AC-3) | MNT-UI-003 | ✅ PASS | |
| 4 | /api/sessions GET — mentor 접근 가능 (AC-4-a) | MNT-API-001 | ✅ PASS | |
| 5 | /api/sessions/:id GET — mentor 접근 가능 (AC-4-b) | MNT-API-002 | ✅ PASS | |
| 6 | /api/mentor/consultation-notes GET (AC-4-c) | MNT-API-003 | ✅ PASS | |
| 7 | /api/mentor/consultation-notes POST (AC-4-d) | MNT-API-004 | ✅ PASS | |
| 8 | /api/sessions POST — mentor 생성 불가 403 (AC-4-e) | MNT-SEC-001 | ✅ PASS | |
| 9 | consultation_notes INSERT RLS — role 체크 (AC-4-e) | MNT-SEC-002 | ✅ PASS | |

### `02-regression.spec.ts` — 7/7 PASS

| # | 테스트명 | 회귀 ID | 결과 | 비고 |
|---|----------|---------|------|------|
| 10 | mentor role CHECK 제약 (회귀 #1-a) | REG-001a | ✅ PASS | |
| 11 | consultation_notes INSERT role 체크 (회귀 #1-b) | REG-001b | ✅ PASS | |
| 12 | teacher → /owner 접근 거부 (회귀 #2-a) | REG-002a | ✅ PASS | |
| 13 | student → /owner 접근 거부 (회귀 #2-b) | REG-002b | ✅ PASS | |
| 14 | NEXT_PUBLIC_ 접두사 키 노출 없음 (회귀 #3) | REG-003 | ✅ PASS | |
| 15 | draft 세션 join_code DOM 미노출 (회귀 #4, ISD-ERR-001) | REG-004 | ✅ PASS | |
| 16 | (부가) owner SELECT RLS 격리 | REG-005 | ✅ PASS | |

### `03-instructor-flow.spec.ts` — 5/5 PASS

| # | 테스트명 | AC | 결과 | 비고 |
|---|----------|----|------|------|
| 17 | 강사 인증 → /instructor 리다이렉트 (CMN-UI-002) | CMN-UI-002 | ✅ PASS | |
| 18 | 강사 대시보드 렌더링 (IDB-UI-001) | IDB-UI-001 | ✅ PASS | |
| 19 | 새 세션 생성 플로우 (ISN-UI-001, ISN-API-001) | ISN-UI-001, ISN-API-001 | ✅ PASS | |
| 20 | 세션 상태 draft → active + 참여코드 노출 (ISD-UI-001, ISD-UI-004) | ISD-UI-001, ISD-UI-004 | ✅ PASS | |
| 21 | draft 세션 join_code DOM 미노출 (ISD-ERR-001) | ISD-ERR-001 | ✅ PASS | |

### `04-build-integrity.spec.ts` — 5/5 PASS

| # | 테스트명 | AC | 결과 | 비고 |
|---|----------|----|------|------|
| 22 | 빌드 산출물 존재 확인 (AC-8-a) | AC-8 | ✅ PASS | |
| 23 | 주요 API 엔드포인트 응답 확인 (AC-8-b) | AC-8 | ✅ PASS | |
| 24 | 환경변수 보안 검사 (AC-8-c) | AC-8 | ✅ PASS | |
| 25 | TypeScript 타입 에러 없음 (AC-8-d) | AC-8 | ✅ PASS | |
| 26 | RLS 정책 활성화 확인 (AC-8-e) | AC-8 | ✅ PASS | |

---

## 발견 이슈 및 수정 내역

### Issue 1: profiles RLS 무한재귀 (CRITICAL — 원격 DB 미적용)

- **증상**: API 호출 시 500 에러 (`infinite recursion detected in policy for relation profiles`), `/` 접속 시 ERR_TOO_MANY_REDIRECTS
- **근본 원인**: 원격 Supabase DB에 마이그레이션 `00006_fix_profiles_rls_recursion.sql`이 미적용 상태. 기존 `profiles_select_same_academy` 정책이 직접 서브쿼리(`SELECT academy_id FROM profiles WHERE id = auth.uid()`)로 profiles 자기참조 → 무한재귀 발생
- **영향 범위**: 모든 인증 후 페이지 (리다이렉트 루프), 모든 API 엔드포인트 (403/500)
- **수정**: MCP `apply_migration`으로 `get_my_academy_id()` / `get_my_role()` SECURITY DEFINER 함수 원격 적용 + 전체 테이블 RLS 정책 교체
- **검증**: REST API 직접 호출로 정상 응답 확인 후 테스트 재실행

### Issue 2: 세션 생성 폼 셀렉터 불일치 (테스트 코드 버그)

- **증상**: `ISN-UI-001` 테스트 — 폼 입력 실패
- **근본 원인**: 스펙 파일에서 `input[name="title"]` 셀렉터 사용, 실제 `new/page.tsx`는 `id="title"` (name 속성 없음)
- **수정**: `page.fill('#title', ...)`, `page.fill('#subject', ...)` 로 변경
- **파일**: `tests/e2e/03-instructor-flow.spec.ts`

### Issue 3: join_code 정규식 오류 (테스트 코드 버그)

- **증상**: `ISD-UI-004` 테스트 — 6자리 참여코드 검출 실패
- **근본 원인**: 정규식 `/\b\d{6}\b/` (숫자만) vs 실제 생성 charset `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (영숫자 혼합)
- **수정**: `/\b[A-Z0-9]{6}\b/` 로 변경
- **파일**: `tests/e2e/03-instructor-flow.spec.ts`

---

## 스크린샷

Playwright 기본 설정(`retries: 0`, `screenshot: 'only-on-failure'`) 기준 — 모든 테스트 PASS로 스크린샷 없음. 필요 시 `test-results/` 디렉토리 확인.

---

## 잔여 이슈 → dev-2 수정 완료 (재실행 26/26 PASS 확인)

| ID | 내용 | 상태 |
|----|------|------|
| REM-001 | `owner/layout.tsx` role guard 미구현 | ✅ dev-2 수정 완료 (instructor/student layout도 함께) |
| REM-002 | join_code 생성 시점 — draft 생성 시 pre-generate → active 전환 시 발급으로 수정 | ✅ dev-2 수정 완료 |

---

## 결론 (Cycle 1)

**Must TC 전체 PASS** — 데모 준비 완료. 잔여 이슈 2건은 기능 동작에 영향 없으나 보안 강화 및 비즈니스 로직 정합성 관점에서 post-demo 개선 권장.

---

## Cycle 2 Round 0 (pre-patch 기준선)

**실행일시**: 2026-04-11  
**패치 내용**: `global-setup.ts` warm-up 추가 (Patch 1) + dev-2 layout guards + join_code 지연 발급  
**결과**: ✅ 26/26 PASS (23.6s, workers: 4)

| 항목 | 수치 |
|------|------|
| 전체 테스트 수 | 26 |
| PASS | 26 |
| FAIL | 0 |
| workers | 4 (병렬) |
| 소요시간 | 23.6s |

**비고**: warm-up 패치 적용 후 회귀 없음. Cycle 2 TC 확장(T10→T11) 준비 완료.

---

## Cycle 2 Round 0.5 (Patch 1+2 통합)

**실행일시**: 2026-04-11  
**패치 내용**:
- Patch 1 (qa): `global-setup.ts` warm-up 추가
- Patch 2 (dev-2): `src/lib/supabase/server.ts` `setAll` 블록 완전 제거 (Context7 표준 — Server Component read-only)

**결과**: ✅ 26/26 PASS (21.7s, workers: 4) — 회귀 0

| 항목 | 수치 |
|------|------|
| 전체 테스트 수 | 26 |
| PASS | 26 |
| FAIL | 0 |
| workers | 4 (병렬) |
| 소요시간 | 21.7s |

**비고**: Patch 2 setAll 제거 후 오히려 21.7s로 단축. T14 완료 — T11 시작 가능.

---

## Cycle 2 Round 0.6 (Patch 2 최종 — rsc.ts 분리)

**실행일시**: 2026-04-11  
**패치 내용**: `src/lib/supabase/rsc.ts` 신규 파일 생성 (Server Component 전용, getAll만) + 5개 Server Component import 변경 (`server` → `rsc`): `page.tsx`, `mentor/layout.tsx`, `owner/layout.tsx`, `instructor/layout.tsx`, `student/layout.tsx`

**결과**: ✅ 26/26 PASS (23.7s, workers: 4) — 회귀 0

| 항목 | 수치 |
|------|------|
| 전체 테스트 수 | 26 |
| PASS | 26 |
| FAIL | 0 |
| workers | 4 (병렬) |
| 소요시간 | 23.7s |

**비고**: Context7 Pattern 완전 준수 — Server Component read-only `rsc.ts` / Route Handler `server.ts` 분리. silent failure 완전 해소. Patch 2 완전 종료.
