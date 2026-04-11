# 비평 리포트

> 작성: critic-2 · 2026-04-10 · Task #3 산출물  
> 검토 대상: `docs/scrum/analysis-report.md` vs `docs/scrum/acceptance-criteria.md`  
> 직접 재검증: use-realtime.ts, ai/ routes (모두 4개), constants.ts, schemas/mentor-briefing.ts

---

## 1. Analyst 리포트 평가

### 동의 (정확히 맞음)

| 항목 | 판정 |
|------|------|
| DB CHECK 제약 mentor 누락 — Critical 선행 조건 | ✅ 정확 |
| mentor 라우팅 6개 파일 (page/login/register/layout/api-students/api-consultations) | ✅ 정확 |
| consultation_notes INSERT RLS에서 role 체크 제거된 것 (migration 00006 회귀) | ✅ 정확 |
| API camelCase ↔ 프론트 snake_case 데이터 계약 불일치 (런타임 TypeError) | ✅ 정확 |
| join_code 노출 방어 코드 살아있음 (회귀 없음) | ✅ 정확 |
| 원장 RLS 격리 및 role 체크 살아있음 | ✅ 정확 |
| temperature: quiz=0.3, coaching/report=0.5 — 상수로 올바르게 관리됨 | ✅ 정확 |
| 1회 재시도 로직 — 4개 AI route 전부 동일 패턴으로 구현됨 | ✅ 정확 |
| CLAUDE.md §11-15 (프롬프트/스키마 분리, Zod 검증, 서버사이드 호출) 준수 | ✅ 정확 |

### 반박/보강이 필요한 항목

**U-3을 UNKNOWN으로 남긴 것** — `/api/ai/mentor-briefing/route.ts`는 직접 확인했으며 **Critical 확정**이다.  
`line 121`: `!["owner", "teacher"].includes(profile.role)` → mentor 403. Analyst가 스캔 범위에서 제외한 것은 이해하나, Dev 체크리스트에서 누락되면 mentor 브리핑 기능 전체가 동작하지 않는다.

---

## 2. 놓친 리스크

### 🔴 Critical — Dev 반드시 수정

**N-1. `/api/ai/mentor-briefing/route.ts:121` — mentor 403**

```typescript
// 현재 (mentor 차단)
if (!["owner", "teacher"].includes(profile.role)) {
// 필요 수정
if (!["owner", "teacher", "mentor"].includes(profile.role)) {
```
Analyst의 C-7은 `/api/mentor/` 하위만 커버했다. `/api/ai/mentor-briefing`은 mentor 핵심 기능이며 동일 문제가 있다. **스프린트 목적 자체가 무너진다.**

**N-2. `/api/ai/analysis/route.ts:171` — mentor 403**

```typescript
// 현재
if (!profile || !["owner", "teacher"].includes(profile.role)) {
// 필요 수정
if (!profile || !["owner", "teacher", "mentor"].includes(profile.role)) {
```
mentor가 학생 이탈 분석을 보려면 analysis API에도 접근해야 한다. Analyst의 API 스캔은 `/api/mentor/` 한정이었고, `/api/ai/analysis`는 누락됐다.

**N-3. `/api/ai/report/route.ts:138,332` — mentor가 학생으로 취급됨**

```typescript
// 현재
const isTeacher = ["owner", "teacher"].includes(profile.role);
```
mentor role이 추가되면 이 라인에서 mentor는 `isTeacher=false` → 수강생 분기로 들어간다. 강사용 리포트를 생성할 수 없고, studentId 파라미터도 무시된다. mentor가 teacher처럼 리포트를 조회해야 하는지 여부를 Dev가 판단하고, `isTeacher`를 `isStaff`로 리네임하거나 mentor 전용 분기를 추가해야 한다.

> **영향 범위 요약**: Analyst가 C-7로 커버한 3개 파일 외, `/api/ai/` 하위 3개 파일이 추가로 수정 필요. 총 수정 대상 API 파일 = **6개**.

---

### 🟡 High — 근본 수정 필요 (워크어라운드 금지)

**N-4. `use-realtime.ts:26-34` — `loadExisting()` silent failure**

```typescript
// 현재 — error 무시, data가 null이면 빈 화면
async function loadExisting() {
  const { data } = await supabase.current
    .from("responses")
    .select(...)
  if (data) { setResponses(data); }
}
```
`error`를 전혀 destructure하지 않는다. RLS 위반, 네트워크 오류, 세션 만료 시 `data=null`이지만 컴포넌트는 아무 오류 표시 없이 빈 히트맵을 렌더한다. Analyst가 mentor pages의 silent failure는 잡았지만, F4 히트맵의 핵심 데이터 소스인 이 훅은 놓쳤다.

**N-5. `use-realtime.ts:59-61` — Realtime 채널 에러 silent**

```typescript
// 현재
.subscribe((status) => {
  setIsConnected(status === "SUBSCRIBED");
});
```
Supabase Realtime `status`는 `"SUBSCRIBED"` 외에 `"CHANNEL_ERROR"`, `"TIMED_OUT"`, `"CLOSED"` 등이 있다. 채널 에러 시 `isConnected=false`로 내려가지만, **에러 상태를 리턴하는 방법이 없다**. 훅 반환 타입에 `error` 필드가 없어 컴포넌트는 연결 실패 여부를 알 수 없다.

---

### 🟠 Medium

**N-6. `mentor-briefing/route.ts:287` — RISK_SPEED_INCREASE_RATIO 파생 문자열 하드코딩**

```typescript
// 현재
riskSignals.push("응답 속도 30% 이상 증가");
// 올바른 방식
riskSignals.push(`응답 속도 ${Math.round((RISK_SPEED_INCREASE_RATIO - 1) * 100)}% 이상 증가`);
```
`RISK_SPEED_INCREASE_RATIO = 1.3`에서 파생된 "30%"를 문자열 리터럴로 박아두었다. CLAUDE.md §20 위반이 아닌가 하는 의문이 있으나, 실질적으로는 상수가 바뀌면 riskSignal 출력이 틀려지는 버그다. Analyst가 §20 점검에서 "매직넘버 없음"으로 판정했지만 이 문자열 파생값은 놓쳤다.

**N-7. `schemas/mentor-briefing.ts` — `recommendedCourses` 배열 `.min()` 없음**

```typescript
recommendedCourses: z.array(z.object({...})),
// 빈 배열이 스키마 통과 가능 → AI가 추천 강의 없이 응답해도 조용히 통과
```
AC 범위가 아닌 품질 이슈. 그러나 AI가 빈 배열로 응답해도 검증 통과하므로 상담 브리핑에서 강의 추천이 누락되는 silent 결과가 발생할 수 있다.

---

### 🔴 Critical — Critic 독립 검증 추가 발견

**N-8. `mentor-briefing/route.ts:173-178` — mentor role 허용 후에도 빈 데이터 반환 (기능 무의미)**

role 체크(N-1)를 수정해도 다음 로직이 mentor를 broken 상태로 만든다:

```typescript
// line 173-178 — teacher_id = user.id 로 세션 조회
const { data: mySessions } = await supabase
  .from("sessions")
  .select("id, subject, created_at")
  .eq("teacher_id", user.id)  // ← mentor는 teacher가 아니므로 항상 []
  ...
const sessionIds = (mySessions ?? []).map((s) => s.id);  // → []
// 이후 responses, quizzes IN ([]) → 전부 빈 결과
// → riskLevel = LOW, weakTopics = [], riskSignals = []
// → AI 브리핑: "이탈 위험 없음, 약점 없음, 추천 강의 없음"
```

mentor가 실제로 학원 내 모든 세션(또는 배정 세션)을 참조해야 한다. `teacher_id = user.id` 조건을 삭제하거나 mentor 분기를 추가해야 함. **Dev 착수 전 planner와 mentor의 세션 접근 범위를 합의할 것.**

**N-9. `migration 00006` — `consultation_notes_select` mentor 역할 미결정**

```sql
CREATE POLICY "consultation_notes_select" ON consultation_notes
  FOR SELECT USING (
    academy_id = get_my_academy_id()
    AND (instructor_id = auth.uid() OR get_my_role() = 'owner')
  );
```

mentor는 자신이 작성한 notes만 조회 가능. 다른 mentor가 작성한 동일 수강생의 상담 이력을 못 봄. 비즈니스 요건 확인 필요: mentor가 학원 내 전체 상담 이력 조회 필요 시 `get_my_role() IN ('owner', 'mentor')` 추가. **C-1 마이그레이션에 함께 결정해야 함.**

---

## 3. Dev 필수 수정 체크리스트

본 스프린트에서 Dev(`dev-2`)가 반드시 수정해야 할 전체 목록. Analyst의 C-1~C-8 + Critic 추가 N-1~N-6.

### DB 마이그레이션 (선행 조건)
- [ ] `supabase/migrations/00007_add_mentor_role.sql` — `profiles.role` CHECK에 `'mentor'` 추가
- [ ] 동 마이그레이션에서 `consultation_notes` INSERT RLS role 체크 복원 (`get_my_role() IN ('owner', 'teacher', 'mentor')`)

### 인증/라우팅 (AC-1~4)
- [ ] `src/app/api/auth/register/route.ts:9` — Zod enum에 `"mentor"` 추가
- [ ] `src/app/register/page.tsx:14-18` — `ROLE_OPTIONS`에 mentor 항목 추가, 등록 성공 후 `/mentor` 리다이렉트
- [ ] `src/app/login/page.tsx:49` — switch에 `case 'mentor': router.push('/mentor')` 추가
- [ ] `src/app/page.tsx:18` — switch에 `case 'mentor': redirect('/mentor')` 추가
- [ ] `src/app/mentor/layout.tsx` — Server Component로 전환, role 가드 추가 (비mentor → 각자 홈 리다이렉트)

### mentor API role 체크 (Analyst C-7 + Critic N-1~N-3)
- [ ] `src/app/api/mentor/students/route.ts:53` — `"mentor"` 포함
- [ ] `src/app/api/mentor/students/[id]/route.ts:45` — 동일
- [ ] `src/app/api/mentor/consultations/route.ts:41,108` — 동일 (GET/POST)
- [ ] **`src/app/api/ai/mentor-briefing/route.ts:121`** — 동일 (Analyst 미발견)
- [ ] **`src/app/api/ai/analysis/route.ts:171`** — 동일 (Analyst 미발견)
- [ ] **`src/app/api/ai/report/route.ts:138,332`** — mentor role 처리 정책 결정 및 구현 (Analyst 미발견)

### 데이터 계약 통일 (Analyst C-8)
- [ ] `GET /api/mentor/students` 응답을 `StudentRisk[]` flat array로 변경
- [ ] `GET /api/mentor/students/[id]` 응답 필드를 camelCase 통일
- [ ] `GET /api/mentor/consultations` 응답을 `ConsultationNote[]` flat array로 변경
- [ ] 프론트엔드 인터페이스를 API 응답 형태와 1:1 맞춤 (API 변경 시 프론트도 동시 수정)

### Silent failure 수정 (Critic N-4~N-5)
- [ ] `src/hooks/use-realtime.ts:26` — `{ data, error }` destructure + error 처리 추가
- [ ] `src/hooks/use-realtime.ts:59-61` — subscribe 콜백에 CHANNEL_ERROR/TIMED_OUT 핸들링, 반환 타입에 `error` 필드 추가

### 매직 문자열 수정 (Critic N-6)
- [ ] `src/app/api/ai/mentor-briefing/route.ts:287` — `"30%"` 하드코딩 → `RISK_SPEED_INCREASE_RATIO`에서 파생된 동적 문자열로 교체

---

## 4. Dev 금지 사항 (워크어라운드 리스트)

| 금지 | 이유 |
|------|------|
| `use-realtime.ts` loadExisting 에러를 `catch {}` 또는 `?? []`로 폴백 | 히트맵 빈 화면 silent failure 고착 |
| `/api/ai/report/route.ts`에서 mentor를 `!isTeacher` 분기(학생 취급)로 처리 | mentor는 학생이 아님 — 강사 측 리포트 생성 권한 필요 |
| C-8 API↔프론트 계약 수정을 분리 커밋 | API만 변경하면 런타임 TypeError crash 발생 (반드시 원자적 변경) |
| `any` 타입 사용 (특히 Supabase join 결과 캐스팅 시) | CLAUDE.md §16 — `unknown` + 타입 가드 사용 |
| `console.log` 디버깅 코드 커밋 | CLAUDE.md §17 |
| Out of Scope 항목 수정 (UI 재디자인, 새 기능, AI 프롬프트 수정, Vercel 배포) | CLAUDE.md §7, AC Out of Scope 조항 |
| migration에 RLS 없이 새 테이블/정책 추가 | CLAUDE.md §4, DoD §4 |
| 마이그레이션 없이 Zod enum만 변경 (DB INSERT 단계에서 CHECK violation) | DB 선행 조건 필수 |
| `--no-verify` 플래그로 커밋 | 훅 실패 시 원인 수정이 원칙 |

---

## 5. GO/NO-GO — Dev 착수 승인

### **GO** ✅

**근거:**
- Analyst 리포트는 핵심 영역(mentor 라우팅 9건, RLS 회귀, 데이터 계약, silent failure)을 정확하게 커버했다.
- Critic이 추가로 발견한 항목(N-1~N-6)은 위 체크리스트에 모두 포함됐다.
- Dev가 이 critique.md의 체크리스트를 기준으로 작업하면 AC-1~8을 전부 충족할 수 있다.
- `consultant_notes` RLS, `use-realtime.ts`, `/api/ai/` 3개 파일 누락 등 새로 발견된 항목도 구현 난이도가 낮아 스프린트 범위 내 처리 가능하다.

**전제 조건:**
- Dev는 DB 마이그레이션(00007)을 **모든 코드 변경보다 먼저** 적용할 것.
- C-8 API↔프론트 계약 수정은 **단일 커밋(원자적)** 으로 처리할 것.
- `/api/ai/report/route.ts`의 mentor 처리 정책을 착수 전 planner와 확인할 것 (mentor가 학생 개별 리포트를 조회해야 하는지 여부).
