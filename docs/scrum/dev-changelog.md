# Dev Changelog

## Round-2.5 — P6 academy 교차 참여 취약점 fix + migration 00008 (2026-04-11)

### P6: session_participants academy_id 격리 누락 fix

| 파일 | 변경 내용 |
|------|-----------|
| `src/app/api/participants/route.ts` | POST: profile `.select("role, academy_id")` + session `.select("id, status, title, academy_id")` + academy 불일치 → 400 |
| `src/app/api/sessions/join/route.ts` | 동일 패턴 적용, 불일치 → 404 |
| `supabase/migrations/00008_fix_session_participants_rls.sql` | **신규** — 이중 INSERT 정책 정리 + academy/active 3중 체크 정책 신규 생성 |

- 취약점: A 학원 수강생이 B 학원 join_code로 B 학원 세션 참여 가능 (API 레이어 무방비)
- 오류 메시지 "유효하지 않은 참여 코드"로 통일 — 학원 교차 여부 미노출 (정보 은닉)
- migration 00008 작성 완료 후 **team-lead Supabase MCP로 원격 DB 즉시 적용** (타이밍: critic-2 Cycle 3 이관 판단과 병행, 결과적으로 defense-in-depth 즉시 달성)

### 검증
- `tsc --noEmit --skipLibCheck` → src/ 에러 0건
- `pg_policies` 조회: `participants_select_same_academy` (SELECT) + `participants_insert_student_academy_active` (INSERT) 2개만 존재 확인

### 산출물
- `docs/scrum/cycles/round-2.5-p6-verification.md` — 취약점 분석, fix 내용, migration 적용 결과

---

## Round-1-fix — P0 계정 복구 + P1 /api/participants 신규 (2026-04-11)

### P0: Supabase 테스트 계정 storageState 복구

| 항목 | 내용 |
|------|------|
| 원인 | `.auth/*.json` access token 만료 (2026-04-10 22:32 UTC 기준) |
| 계정 상태 | 4개 모두 존재 확인 (Supabase MCP execute_sql) — 삭제/비번 리셋 아님 |
| 조치 | 만료된 `.auth/{owner,teacher,student,mentor}.json` 삭제 → global-setup.ts 재실행으로 갱신 |

### P1: `/api/participants` 신규 생성

| 파일 | 변경 내용 |
|------|-----------|
| `src/app/api/participants/route.ts` | **신규** — `POST` (수강생 세션 참여, 409 중복 처리), `GET` (teacher/owner 참여자 목록) |

- Zod 검증: `joinCode` 6자리, `sessionId` UUID
- POST: student role 확인 → join_code 조회 → active 상태 확인 → 중복 체크 → INSERT (201/409)
- GET: teacher/owner 확인 → academy_id 격리 → session_participants 반환
- `@wiki api-participants`, `@wiki feature-f3-response-collection` 주석 포함

### 검증
- `tsc --noEmit --skipLibCheck` → src/ 에러 0건 (tests/ 타입 에러는 QA 담당)
- `npm run build` → 빌드 성공

---

## T14-Patch2 — Supabase 클라이언트 분리 + setAll silent failure 해소 (2026-04-11)

### 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/lib/supabase/server.ts` | `setAll` 제거 + 4줄 경고 주석 — Route Handler 전용, 현재 getUser()만 사용하여 리프레시 불필요 |
| `src/lib/supabase/rsc.ts` | **신규** — Server Component 전용, `getAll` 단독 (Context7 Pattern 3) |
| `src/app/page.tsx` | import `@/lib/supabase/server` → `@/lib/supabase/rsc` |
| `src/app/mentor/layout.tsx` | 동일 |
| `src/app/owner/layout.tsx` | 동일 |
| `src/app/instructor/layout.tsx` | 동일 |
| `src/app/student/layout.tsx` | 동일 |

### 배경
- 기존 `server.ts`의 `setAll` try/catch 빈 블록 → silent failure (라이브러리 경고 억제)
- Context7 `/supabase/ssr` 공식 설계: Pattern 1/2(middleware/Route Handler)는 read/write, Pattern 3(Server Component)는 read-only
- team-lead grep 검증: API Route 18개 모두 `auth.getUser()`만 사용 → setAll 실제 호출 경로 없음
- 세션 리프레시는 `middleware.ts` 전담 (공식 패턴 준수)
- **최종 확정 (team-lead 승인)**: setAll 제거 + rsc.ts 분리 혼합 적용 — Context7 Pattern 1/2/3 모두 준수

### 검증
- `tsc --noEmit --skipLibCheck` → src/ 에러 0건
- `npm run build` → 빌드 성공

---

## T7-hotfix — join_code 지연 발급 (2026-04-11)

### 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/app/api/sessions/route.ts` | POST: `join_code` 사전 생성 제거 — draft 상태로 생성 시 null |
| `src/app/api/sessions/[id]/route.ts` | PATCH: `status → active` 전환 시 `join_code = generateJoinCode()` 최초 발급, `generateJoinCode()` 함수 이동 |

### 배경
- E2E 테스트 스펙: draft 세션 `join_code === null`, active 전환 시 발급
- 기존 코드는 POST 시 join_code를 사전 생성 → 테스트 #11/#21 실패
- `SESSION_CODE_LENGTH` import + `generateJoinCode` 함수를 `[id]/route.ts`로 이동

### 검증
- `tsc --noEmit --skipLibCheck` → src/ 에러 0건
- `npm run build` → 빌드 성공

---

## T4-hotfix — role guard 누락 layout 일괄 추가 (2026-04-11)

### 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/app/owner/layout.tsx` | Server Component 전환, `auth.getUser()` + `profiles.role` role guard (비owner → 각자 홈 리다이렉트) |
| `src/app/instructor/layout.tsx` | 동일 패턴 — teacher 전용 가드 추가 |
| `src/app/student/layout.tsx` | 동일 패턴 — student 전용 가드 추가 |

### 배경
- analyst/critic가 T4 분석에서 `mentor/layout.tsx` 누락만 지적했으나, `owner`, `instructor`, `student` layout에도 role guard가 전무했음
- QA T7 실행 중 `owner/layout.tsx` 미가드 확인 → T4 범위 확장 처리

### 검증
- `npx tsc --noEmit --skipLibCheck` → `src/` 에러 0건
- `npm run build` → 빌드 성공, 전체 Dynamic 라우트 정상 포함

---

## T5 — Playwright E2E 인프라 셋업 (2026-04-10)

### 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `package.json` | `@playwright/test ^1.59.1` devDependencies 추가, `test:e2e` / `test:e2e:ui` scripts 추가 |
| `pnpm-lock.yaml` | pnpm lockfile 업데이트 |
| `playwright.config.ts` | 수정 — `baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'` (AC-6 env 지원), `reporter: 'list'` 단일화 (기존 `[['html'],['list']]` → 'list') |
| `tests/e2e/.gitkeep` | e2e 디렉토리 생성 (스펙 파일은 QA 작성) |
| `.gitignore` | `/playwright/.cache/` 추가 (이미 `playwright-report/`, `test-results/` 존재) |

### 검증
- `npx playwright test --list` → `Total: 0 tests in 0 files` (정상, 스펙 없는 상태 예상값)
- Chromium 설치: `/Users/sprtms16/Library/Caches/ms-playwright/chromium-1217`

---

## T4 — mentor 라우팅 fix + 회귀 리스크 fix (2026-04-11)

### 변경 파일

| 파일 | 변경 내용 | AC/리스크 |
|------|-----------|-----------|
| `supabase/migrations/00007_add_mentor_role.sql` | `profiles.role` CHECK에 `'mentor'` 추가, `consultation_notes` INSERT RLS role 체크 복원 | AC-1 선행조건, C-1, H-1 |
| `src/app/api/auth/register/route.ts` | Zod enum에 `"mentor"` 추가 | AC-1 |
| `src/app/register/page.tsx` | `ROLE_OPTIONS`에 mentor 항목 추가, 등록 성공 후 `/mentor` 리다이렉트 | AC-1 |
| `src/app/login/page.tsx` | switch에 `case "mentor": router.push("/mentor")` 추가 | AC-2 |
| `src/app/page.tsx` | switch에 `case "mentor": redirect("/mentor")` 추가 | AC-3 |
| `src/app/mentor/layout.tsx` | Server Component 전환, `auth.getUser()` + `profiles.role` role guard (비mentor → 각자 홈 리다이렉트) | AC-4 |
| `src/app/api/mentor/students/route.ts` | role 체크에 `"mentor"` 추가, 응답 형태를 프론트 `StudentRisk[]` snake_case flat array로 변환 | C-7, C-8 |
| `src/app/api/mentor/students/[id]/route.ts` | role 체크에 `"mentor"` 추가, 응답 형태를 프론트 `StudentDetail` snake_case로 변환 | C-7, C-8 |
| `src/app/api/mentor/consultations/route.ts` | role 체크에 `"mentor"` 추가 (GET/POST), GET 응답 flat array, POST 응답 단일 객체로 변환 | C-7, C-8 |
| `src/app/api/ai/mentor-briefing/route.ts` | role 체크에 `"mentor"` 추가 (N-1), 매직 문자열 `"30%"` → `RISK_SPEED_INCREASE_RATIO` 파생 동적 문자열 (N-6), 응답 프론트 `MentorBriefing` snake_case로 변환 | N-1, N-6 |
| `src/app/api/ai/analysis/route.ts` | GET/POST role 체크에 `"mentor"` 추가 | N-2 |
| `src/app/api/ai/report/route.ts` | `isTeacher` → `isStaff` 리네임, mentor 포함 | N-3 |
| `src/hooks/use-realtime.ts` | `loadExisting()` error 처리 추가, subscribe CHANNEL_ERROR/TIMED_OUT 핸들링, 반환 타입에 `error` 필드 추가 | N-4, N-5 |

| `src/app/api/mentor/students/route.ts` (추가) | mentor 세션 쿼리를 academy_id 기반으로 분기 (N-8) | N-8 |
| `src/app/api/mentor/students/[id]/route.ts` (추가) | 동일 분기 (N-8) | N-8 |
| `src/app/api/ai/mentor-briefing/route.ts` (추가) | 동일 분기 (N-8) | N-8 |
| `supabase/migrations/00007_add_mentor_role.sql` (추가) | `consultation_notes_select` RLS에 mentor 조회 범위 추가 (N-9) | N-9 |

### 검증
- `npx tsc --noEmit --skipLibCheck` → `src/` 에러 0건 (`.next/dev/types` 캐시 에러는 dev 재기동 시 해소)
- `npm run build` → 빌드 성공, `/mentor` Dynamic 라우트 정상 포함 (N-8, N-9 수정 후 재확인)
- `npm run lint` → pre-existing 설정 누락 문제 (eslint.config.js 없음) — 내 변경과 무관
- `any` 신규 도입 0건, `console.log` 0건, 매직 넘버 0건
