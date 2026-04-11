# 분석 리포트 — Argos mentor fix sprint

> 작성: analyst-2 · 2026-04-10  
> SSoT: `docs/scrum/acceptance-criteria.md`  
> 스캔 범위: AC-1~4 mentor 유령 라우트 + AC-5 회귀 리스크 4건 + AC-8 코드 품질

---

## 1. AC-1~4 mentor 라우팅 현재 상태

| AC | 파일:라인 | 현재 코드 | 필요 수정 | 위험도 |
|----|-----------|-----------|-----------|--------|
| AC-1 | `supabase/migrations/00001_initial_schema.sql:36` | `CHECK (role IN ('owner', 'teacher', 'student'))` | **mentor 추가 마이그레이션 필요** (Out-of-scope 예외 조항 해당) | Critical |
| AC-1 | `src/app/api/auth/register/route.ts:9` | `z.enum(["teacher", "student", "owner"])` | `"mentor"` 추가 | Critical |
| AC-1 | `src/app/register/page.tsx:14-18` | `ROLE_OPTIONS = [teacher, student, owner]` | mentor 항목 추가 | High |
| AC-1 | `src/app/register/page.tsx:86-97` | switch에 mentor case 없음 → `default: router.push("/")` | `case "mentor": router.push("/mentor")` 추가 | High |
| AC-2 | `src/app/login/page.tsx:49-61` | switch에 mentor case 없음 → `default: router.push("/")` | `case "mentor": router.push("/mentor")` 추가 | High |
| AC-3 | `src/app/page.tsx:18-30` | switch에 mentor case 없음 → `default: redirect("/login")` | `case "mentor": redirect("/mentor")` 추가 | High |
| AC-4 | `src/app/mentor/layout.tsx:1-18` | auth 체크·role 가드 **전혀 없음** — Navbar만 렌더 | `auth.getUser()` + `profile.role` 조회 후 비-mentor 리다이렉트 | Critical |
| AC-4 | `src/app/mentor/page.tsx` | role 체크 없음 (클라이언트 컴포넌트) | 레이아웃 가드로 해결 | (레이아웃에서 처리) |
| AC-4 | `src/app/mentor/students/[id]/page.tsx` | role 체크 없음 (클라이언트 컴포넌트) | 레이아웃 가드로 해결 | (레이아웃에서 처리) |

### 추가 발견: mentor API도 mentor role 차단 중

mentor 역할이 추가돼도 자신의 API에 접근 불가 — 세 파일 모두 동일 패턴:

| 파일:라인 | 현재 체크 | 필요 수정 |
|-----------|-----------|-----------|
| `src/app/api/mentor/students/route.ts:53` | `["owner", "teacher"].includes(profile.role)` | `"mentor"` 추가 |
| `src/app/api/mentor/students/[id]/route.ts:45` | `["owner", "teacher"].includes(profile.role)` | `"mentor"` 추가 |
| `src/app/api/mentor/consultations/route.ts:41,108` | `["owner", "teacher"].includes(profile.role)` | `"mentor"` 추가 |

---

## 2. AC-5 회귀 리스크

### 2-1. join_code 노출 — PASS

| 경로 | 상태 | 근거 |
|------|------|------|
| `POST /api/auth/register` 응답 | PASS | `{ data: { user_id, role } }` 만 반환 (`route.ts:106-109`) |
| `GET /api/sessions` — 수강생 경로 | PASS | `select("id, title, subject, course_category, status, created_at, started_at, ended_at, ...")` — join_code 필드 명시 제외 (`route.ts:90`) |
| `GET /api/sessions/[id]` — 수강생 경로 | PASS | `Object.entries(session).filter(([key]) => key !== "join_code")` 필터링 (`[id]/route.ts:60-62`) |
| `GET /api/sessions` — 강사/원장 경로 | 의도된 노출 | `select("*")` — 강사가 join_code를 학생에게 공유해야 하므로 정상 |

### 2-2. 원장 대시보드 role 체크 — PASS

`src/app/api/dashboard/route.ts:136`
```ts
if (profile.role !== "owner") {
  return NextResponse.json({ error: "원장(owner) 권한이 필요합니다." }, { status: 403 });
}
```
명시적 owner 단일 체크 ✅

### 2-3. RLS 격리 — PASS (단, 주의사항 1건)

**양호한 부분**:
- 모든 테이블에 `ENABLE ROW LEVEL SECURITY` 적용됨
- `migration 00006`: RLS 재귀 루프를 `get_my_academy_id()` SECURITY DEFINER 함수로 해소
- `academy_id` 기반 격리 일관 적용 (academies, sessions, quizzes, responses, analysis_results, student_reports, courses, consultation_notes)
- `consultation_notes` SELECT: `academy_id = get_my_academy_id() AND (instructor_id = auth.uid() OR get_my_role() = 'owner')` ✅

**⚠️ 주의 — consultation_notes INSERT RLS 역할 체크 누락 (migration 00006 회귀)**:
- `migration 00002` 원래 정책: `instructor_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'teacher'))`
- `migration 00006` 교체 정책: `instructor_id = auth.uid() AND academy_id = get_my_academy_id()` — **role 체크 제거됨**
- 결과: 직접 DB 접근 시 student가 상담 기록 INSERT 가능 (API 레이어에서는 role 체크로 막히나 RLS 단에서는 열려있음)
- 위험도: Medium (API 레이어 방어는 있으나 RLS 심층 방어 원칙 위반)

### 2-4. RISK_SPEED_INCREASE_RATIO 상수화 — PASS

| 항목 | 상태 |
|------|------|
| `src/lib/constants.ts:24` `RISK_SPEED_INCREASE_RATIO = 1.3` 정의 | ✅ |
| `src/app/api/mentor/students/route.ts:9,185` — import 후 사용 | ✅ |
| `src/app/api/mentor/students/[id]/route.ts:9,184` — import 후 사용 | ✅ |
| 하드코딩 `1.3` grep 결과 | No matches ✅ |

---

## 3. AC-8 코드 품질 위반

| 항목 | grep 결과 | 판정 |
|------|-----------|------|
| `any` 타입 (`src/**/*.{ts,tsx}`) | No matches | PASS ✅ |
| `console.log` (프로덕션 코드) | 2건 모두 AI 프롬프트 내 **예시 코드 텍스트** (`coaching.ts:85`, `quiz-generation.ts:202`) — 실제 코드 실행 아님 | PASS ✅ |
| `catch {}` (empty catch) | No matches | PASS ✅ |
| 하드코딩 `1.3` | No matches | PASS ✅ |
| 매직 넘버 (`src/lib/constants.ts`) | `RISK_SPEED_INCREASE_RATIO`, `RISK_ACCURACY_THRESHOLD`, `RISK_ABSENCE_THRESHOLD` 등 모두 상수 정의됨 | PASS ✅ |

**AC-8 현재 위반 없음** — 단, mentor fix 구현 시 신규 도입 금지 필요.

---

## 4. 추가 silent failure 발견

### 4-1. `src/hooks/use-realtime.ts` — loadExisting 에러 처리 없음

```ts
async function loadExisting() {
  const { data } = await supabase.current.from("responses")...
  if (data) { setResponses(data); }
  // error 무시 — DB 오류 시 빈 배열 유지, 사용자에게 피드백 없음
}
```
- **위험도**: Low (히트맵이 빈 상태로 표시, 에러 비가시화)
- subscribe 콜백에서 에러 상태 미처리 (`status === "SUBSCRIBED"`만 체크)

### 4-2. `src/app/mentor/page.tsx:38-47` — fetch 실패 무시

```ts
const response = await fetch("/api/mentor/students");
if (response.ok) {
  setStudents(result.data ?? []);
}
// !response.ok 시 setError 없음 → 화면은 빈 리스트, 에러 미표시
setIsLoading(false);
```
- **위험도**: Low

### 4-3. `src/app/mentor/students/[id]/page.tsx`

- `handleGenerateBriefing()` (라인 123-138): 실패 시 에러 표시 없음 (`finally`만 있고 catch 분기 없음)
- `handleSaveNote()` (라인 140-163): 실패 시 에러 표시 없음 (닫기도 안 됨)
- **위험도**: Low (UX 문제, 보안 이슈 아님)

---

## 5. Dev 작업 지시 초안 (우선순위 Critical → Low)

### [Critical-1] DB 마이그레이션 — profiles.role에 mentor 추가

```sql
-- supabase/migrations/00007_add_mentor_role.sql
ALTER TABLE profiles
  DROP CONSTRAINT profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'teacher', 'student', 'mentor'));
```
> ⚠️ Out-of-scope 예외 조항("analyst가 다르게 보고하면 별도 마이그레이션 티켓") 해당 — **planner 확인 필요**

### [Critical-2] `/mentor` 레이아웃 role 가드 추가

`src/app/mentor/layout.tsx` → 서버 컴포넌트로 전환 + auth.getUser() + profiles.role 조회:
- `mentor`가 아닌 경우: `teacher → /instructor`, `student → /student/join`, `owner → /owner`, 미인증 → `/login`

### [High-1] API 등록 Zod enum에 mentor 추가

`src/app/api/auth/register/route.ts:9`
```ts
role: z.enum(["teacher", "student", "owner", "mentor"]),
```

### [High-2] UI ROLE_OPTIONS에 mentor 추가

`src/app/register/page.tsx:14-18`
```ts
{ value: "mentor", label: "멘토", description: "수강생 이탈 위험 감지 및 상담 관리" }
```
+ 회원가입 후 리다이렉트 switch에 `case "mentor": router.push("/mentor")`

### [High-3] 로그인 switch에 mentor case 추가

`src/app/login/page.tsx:49-61` → `case "mentor": router.push("/mentor")`

### [High-4] 홈 리다이렉트에 mentor case 추가

`src/app/page.tsx:18-30` → `case "mentor": redirect("/mentor")`

### [High-5] mentor API role 체크에 mentor 추가

3개 파일 동일 패턴:
```ts
// Before
if (!["owner", "teacher"].includes(profile.role))
// After
if (!["owner", "teacher", "mentor"].includes(profile.role))
```
- `src/app/api/mentor/students/route.ts:53`
- `src/app/api/mentor/students/[id]/route.ts:45`
- `src/app/api/mentor/consultations/route.ts:41,108`

### [Medium-1] consultation_notes INSERT RLS role 체크 복원

`supabase/migrations/00007_add_mentor_role.sql` 또는 별도 마이그레이션에 포함:
```sql
DROP POLICY IF EXISTS "consultation_notes_insert" ON consultation_notes;
CREATE POLICY "consultation_notes_insert" ON consultation_notes
  FOR INSERT WITH CHECK (
    instructor_id = auth.uid()
    AND academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'teacher', 'mentor')
  );
```

### [Low] Silent failure 개선 (선택 — AC 외 범위)

- `use-realtime.ts`: `loadExisting` 에러 시 에러 상태 설정 (AC 미포함이지만 안정성 향상)
- mentor 페이지들: fetch 실패 시 에러 메시지 표시

---

## 6. UNKNOWN (추가 조사 필요)

| 항목 | 이유 |
|------|------|
| `profiles.role` DB enum에 `mentor` 추가 시 기존 RLS 정책 영향 여부 | `get_my_role()` 함수를 쓰는 정책들 (`sessions_insert_teacher`, `courses_insert_teacher` 등) — mentor가 포함되면 의도치 않게 강사 권한 획득 가능 여부 확인 필요 |
| `src/app/api/sessions/route.ts:55` `isTeacher` — mentor role 처리 방향 | mentor는 join_code를 볼 필요가 있는가? 현재 student 경로로 처리됨 (join_code 제외). 요구사항 명확화 필요 |
| mentor 회원가입 시 `academy_id` 결정 로직 | `register/route.ts:48-63`: teacher/student는 기존 학원 첫 번째 사용 — mentor도 동일 처리? 아니면 owner처럼 학원 선택? |

---

## 요약 — 수정 필요 파일 목록

| 우선순위 | 파일 | 수정 내용 |
|----------|------|-----------|
| Critical | `supabase/migrations/00007_add_mentor_role.sql` (신규) | profiles.role CHECK + consultations INSERT RLS |
| Critical | `src/app/mentor/layout.tsx` | 서버 컴포넌트 role 가드 |
| High | `src/app/api/auth/register/route.ts` | Zod enum mentor 추가 |
| High | `src/app/register/page.tsx` | ROLE_OPTIONS + switch |
| High | `src/app/login/page.tsx` | switch mentor case |
| High | `src/app/page.tsx` | switch mentor case |
| High | `src/app/api/mentor/students/route.ts` | role check mentor 추가 |
| High | `src/app/api/mentor/students/[id]/route.ts` | role check mentor 추가 |
| High | `src/app/api/mentor/consultations/route.ts` | role check mentor 추가 |
