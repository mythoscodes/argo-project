# 분석 리포트

> 작성: analyst · 2026-04-10 · Task #2 산출물  
> 스캔 범위: mentor 라우팅 전수 + 회귀 리스크 4건 + CLAUDE.md §16-20 준수  
> 코드 수정 없음 — Read/Grep/Glob 전용 조사

---

## 1. mentor 라우팅 전수 스캔

| 파일 | 현재 상태 | 필요 수정 | 위험도 |
|------|---------|---------|------|
| `supabase/migrations/00001_initial_schema.sql:36` | `profiles.role CHECK (role IN ('owner','teacher','student'))` — **`'mentor'` 없음** | 신규 마이그레이션으로 CHECK 제약 확장 필요 | **Critical** |
| `src/app/page.tsx:18-29` | switch에 `mentor` 케이스 없음 → `default: redirect('/login')` | `case 'mentor': redirect('/mentor')` 추가 | **Critical** |
| `src/app/login/page.tsx:49-61` | switch에 `mentor` 케이스 없음 → `default: router.push('/')` | `case 'mentor': router.push('/mentor')` 추가 | **Critical** |
| `src/app/register/page.tsx:14-18` | `ROLE_OPTIONS` 배열에 mentor 항목 없음 | `{ value: 'mentor', label: '멘토', description: '...' }` 추가 | **Critical** |
| `src/app/api/auth/register/route.ts:9` | `z.enum(["teacher","student","owner"])` — mentor 없음 | enum에 `"mentor"` 추가 | **Critical** |
| `src/app/mentor/layout.tsx` | role 가드 전혀 없음 (`Navbar + children` 렌더만) | `createClient()` + `getUser()` + role 분기 → 비mentor는 각자 홈으로 redirect | **Critical** |
| `src/app/api/mentor/students/route.ts:53` | `["owner","teacher"].includes(profile.role)` → mentor role 시 **403** 반환 | 체크에 `"mentor"` 포함 또는 전용 체크로 교체 | **Critical** |
| `src/app/api/mentor/students/[id]/route.ts:45` | 동일 — mentor 403 | 동일 수정 | **Critical** |
| `src/app/api/mentor/consultations/route.ts:41,108` | 동일 — mentor 403 (GET/POST 양쪽) | 동일 수정 | **Critical** |
| `src/app/mentor/page.tsx` | role 체크 없는 클라이언트 컴포넌트; layout 가드 구현 후 커버됨 | layout 가드 완료 후 충분 | Medium |
| `src/app/mentor/students/[id]/page.tsx` | 동일 클라이언트 컴포넌트 | 동일 | Medium |

### 핵심 발견 — DB 스키마 mentor 미등록

`supabase/migrations/00001_initial_schema.sql:36`에서 `profiles.role` CHECK 제약이
`('owner', 'teacher', 'student')`만 허용한다. `'mentor'` 추가 없이 `POST /api/auth/register`에
mentor를 추가해도 DB INSERT 단계에서 PostgreSQL CHECK violation이 발생한다.
즉, **AC-1 달성 전 신규 마이그레이션이 반드시 선행되어야 한다.**

> Out of Scope 조항("DB 스키마의 mentor 관련 필드 확장은 analyst가 다르게 보고하면 별도 마이그레이션 티켓"):
> **analyst는 mentor가 schema에 없음을 확인 → 별도 마이그레이션 필요**

---

## 2. 회귀 리스크 전수 점검

### 2-1. join_code 노출

| 지점 | 현재 상태 | 판정 |
|------|---------|------|
| `POST /api/auth/register` 응답 (`route.ts:106`) | `{ user_id, role }` 만 반환 | ✅ 안전 |
| `GET /api/sessions` 강사 경로 (`route.ts:60`) | `select("*")` — join_code 포함. 강사 본인 세션만 RLS 통과 | ✅ 의도적 |
| `GET /api/sessions` 수강생 경로 (`route.ts:90`) | 명시적 컬럼 목록 — join_code 미포함 | ✅ 안전 |
| `GET /api/sessions/[id]` 비강사 경로 (`route.ts:59-63`) | `Object.fromEntries(... .filter(([key]) => key !== "join_code"))` | ✅ 안전 |
| `/instructor/sessions/[id]/page.tsx:139,310` | `session.join_code` 강사 UI에서 표시·복사 | ✅ 의도적 |

**결론**: join_code 노출 방지 방어 코드 살아있음. 회귀 없음.

---

### 2-2. 원장 role 체크

| 지점 | 현재 상태 | 판정 |
|------|---------|------|
| `GET /api/dashboard` (`route.ts:136`) | `profile.role !== "owner"` → 403 | ✅ |
| `GET/POST /api/sessions` (`route.ts:122`) | `["owner","teacher"].includes(profile.role)` | ✅ |
| `GET /api/mentor/students` (`route.ts:53`) | `["owner","teacher"].includes(profile.role)` — mentor role 차단 | ✅ owner 보호, ⚠️ mentor role 배제 |
| `GET /api/mentor/students/[id]` (`route.ts:45`) | 동일 | ✅/⚠️ |
| `GET/POST /api/mentor/consultations` (`route.ts:41,108`) | 동일 | ✅/⚠️ |

**결론**: 원장 방어 살아있음. 단, `mentor` role 추가 후 mentor API 접근 정책 재정의 필요.

---

### 2-3. RLS 격리

| 테이블 | 최종 정책 (migration 00006 이후) | academy_id 격리 | 판정 |
|-------|-------------------------------|---------------|------|
| `profiles` | `academy_id = get_my_academy_id()` | ✅ | ✅ |
| `academies` | `id = get_my_academy_id()` | ✅ | ✅ |
| `sessions` | SELECT/INSERT `get_my_academy_id()` | ✅ | ✅ |
| `session_participants` | `academy_id` 경유 세션 ID 체크 | ✅ | ✅ |
| `quizzes` | 세션→academy | ✅ | ✅ |
| `responses` | 세션→academy | ✅ | ✅ |
| `analysis_results` | 세션→academy | ✅ | ✅ |
| `student_reports` | `academy_id = get_my_academy_id()` | ✅ | ✅ |
| `courses` | `academy_id = get_my_academy_id()` | ✅ | ✅ |
| `consultation_notes` | SELECT: `academy_id = get_my_academy_id()` | ✅ | ⚠️ |

**⚠️ consultation_notes INSERT 정책 회귀 (migration 00006)**

`00002_mentor_tables.sql`의 원래 INSERT 정책:
```sql
INSERT WITH CHECK (
  instructor_id = auth.uid()
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'teacher'))
);
```

`00006_fix_profiles_rls_recursion.sql`으로 교체된 정책:
```sql
INSERT WITH CHECK (
  instructor_id = auth.uid()
  AND academy_id = get_my_academy_id()
);
```

**role 체크 제거**: 수강생이 Supabase 클라이언트를 직접 호출하면 자신을 `instructor_id`로 하는 상담 기록을 삽입 가능. API 게이트(role 체크)가 1차 방어이나, RLS 단독 방어가 약화됨. DoD §4에 해당 — critic 검토 필요.

---

### 2-4. silent failure

| 지점 | 패턴 | 판정 |
|------|-----|------|
| `src/lib/supabase/server.ts:21` | `catch {}` — Supabase SSR Server Component 쿠키 read-only 공식 패턴 | ✅ 정상 |
| `src/app/api/*/route.ts` JSON parse | `catch {} → return NextResponse.json({error}, {status:400})` | ✅ 에러 응답 있음 |
| AI route 1차 retry | `catch {} → 재시도` — 2차는 `catch(retryError)` 로 에러 propagate | ✅ 정상 |
| `src/app/mentor/page.tsx:41-44` | `if (response.ok) { setStudents(...) }` — `!ok` 시 에러 상태 없음, 빈 화면 | ⚠️ Silent |
| `src/app/mentor/students/[id]/page.tsx:110-118` | `if (studentRes.ok)` 실패 시 `student` = null, `isLoading=false` → 무한 스피너 | **⚠️ Silent** |
| `src/app/mentor/students/[id]/page.tsx:154` | `if (response.ok)` 상담 저장 실패 → 사용자 피드백 없음 | ⚠️ Silent |

**추가 발견 — mentor API ↔ 프론트엔드 데이터 계약 불일치 (Critical 런타임 버그)**

현재 mentor 기능은 `owner/teacher` role 체크 뒤에 막혀있어 실행 불가지만, mentor role 추가 후 즉시 런타임 오류 발생 예상:

| API 응답 형태 | 프론트엔드 기대 | 실제 결과 |
|-------------|-------------|---------|
| `GET /api/mentor/students` → `{ data: { students: [...] } }` | `result.data` = array (`StudentRisk[]`, snake_case) | `result.data` = object → `.filter()` TypeError |
| `GET /api/mentor/students/[id]` → `{ data: { student, riskLevel, riskSignals:[...] } }` | `result.data` = `StudentDetail` (snake_case `risk_level`, `risk_signals.low_accuracy`) | `undefined` for all fields |
| `GET /api/mentor/consultations` → `{ data: { consultations: [...] } }` | `result.data` = array `ConsultationNote[]` | object, not array |

API는 camelCase(`riskLevel`, `displayName`), 프론트는 snake_case(`risk_level`, `display_name`) 기대. Dev 구현 시 API 응답 형태 또는 프론트 인터페이스 중 하나를 맞춰야 함.

---

### 2-5. CLAUDE.md 규칙 준수

| 규칙 | 상태 |
|------|------|
| §16 `any` 타입 금지 | ✅ grep 결과 없음 |
| §17 `console.log` 금지 | ✅ AI 프롬프트 문자열 내 string literal only (실제 호출 아님) |
| §18 미사용 import | grep 미실시 (빌드로 검증 권장) |
| §20 매직 넘버 1.3 | ✅ `RISK_SPEED_INCREASE_RATIO = 1.3` — `src/lib/constants.ts:24` 정의됨, 소스 전체 매직넘버 미발견 |

---

## 3. Dev 작업 지시 초안

우선순위 순 정렬.

### Critical

**C-1. supabase migration — profiles.role에 mentor 추가**
```sql
-- 새 파일: supabase/migrations/00007_add_mentor_role.sql
ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'teacher', 'student', 'mentor'));
-- consultation_notes INSERT RLS도 role 체크 복원
DROP POLICY "consultation_notes_insert" ON consultation_notes;
CREATE POLICY "consultation_notes_insert" ON consultation_notes
  FOR INSERT WITH CHECK (
    instructor_id = auth.uid()
    AND academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'teacher', 'mentor')
  );
```

**C-2. `src/app/api/auth/register/route.ts:9`**
```typescript
role: z.enum(["teacher", "student", "owner", "mentor"]),
```

**C-3. `src/app/register/page.tsx:14-18`**
```typescript
const ROLE_OPTIONS = [
  ...
  { value: "mentor", label: "멘토", description: "수강생 이탈 위험 감지 및 상담 관리" },
];
// register 성공 후 switch에도 case 'mentor': router.push('/mentor') 추가
```

**C-4. `src/app/login/page.tsx:49`**
```typescript
case "mentor":
  router.push("/mentor");
  break;
```

**C-5. `src/app/page.tsx:18`**
```typescript
case "mentor":
  redirect("/mentor");
  break;
```

**C-6. `src/app/mentor/layout.tsx` — role 가드 추가**
```typescript
// Server Component로 전환
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
const ROLE_HOME: Record<string, string> = {
  teacher: "/instructor",
  student: "/student/join",
  owner: "/owner",
};
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect("/login");
const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
if (!profile || profile.role !== "mentor") {
  redirect(ROLE_HOME[profile?.role ?? ""] ?? "/login");
}
```

**C-7. mentor API role 체크 수정** (`/api/mentor/students/route.ts:53`, `[id]/route.ts:45`, `consultations/route.ts:41,108`)
```typescript
// "mentor" role도 허용
if (!["owner", "teacher", "mentor"].includes(profile.role)) {
```

**C-8. mentor API ↔ 프론트엔드 데이터 계약 통일**
API 응답 형태를 프론트엔드 인터페이스에 맞추거나 프론트엔드를 API 계약에 맞게 수정.
권장: API가 camelCase로 통일 → 프론트 인터페이스를 camelCase로 변경.
- `/api/mentor/students` → `{ data: StudentRisk[] }` (flat array)
- `/api/mentor/students/[id]` → `{ data: StudentDetail }` 단일 객체
- 구체 필드: `student_id → studentId`, `risk_level → riskLevel`, `risk_signals → riskSignals` (배열) 등

### High

**H-1. consultation_notes INSERT RLS — role 체크 복원** (C-1에 포함 권장)

**H-2. mentor 페이지 silent failure 처리** — 개발 범위에 따라 처리 (AC-8 빌드 무결성 영향 없으나 UX 개선)

### Medium

**M-1. `src/app/mentor/students/[id]/page.tsx` — 무한 스피너 방지**
`student === null && !isLoading` 시 에러 화면 렌더.

---

## 4. UNKNOWN 리스트 (추가 조사 필요)

| # | 내용 | 이유 |
|---|------|------|
| U-1 | `consultation_notes` INSERT RLS 취약점이 prod DB에 실제 적용됐는지 | Supabase remote migration 상태 미확인 |
| U-2 | `get_my_role()` 함수가 mentor role 추가 후 정상 작동하는지 | CHECK 변경 전 DB 인스턴스 상태 미검증 |
| U-3 | `/api/ai/mentor-briefing` role 체크 현황 | 파일 스캔 미포함 |
| U-4 | `src/app/mentor/students/[id]/page.tsx` 데이터 페칭 오류 시 무한 스피너 — 실제 빌드에서 TypeScript 오류 발생 여부 | 빌드 실행 불가 환경 |
| U-5 | Playwright 설치 현황 (`package.json` devDeps) | AC-6 대상이나 Task #2 범위 외 |

---

## 요약

| 구분 | Critical | High | Medium |
|------|---------|------|--------|
| mentor 라우팅 누락 | 9건 | 0 | 2 |
| RLS 회귀 | 1건 | 0 | 0 |
| 데이터 계약 불일치 | 1건 (런타임 버그) | 0 | 0 |
| Silent failure | 0 | 1 | 2 |
| CLAUDE.md 규칙 | 0 | 0 | 0 |

**선행 조건**: Dev 작업 시작 전 C-1(DB 마이그레이션) 확정 필수. `profiles.role` CHECK 없이는 C-2~C-8 전부 무의미.
