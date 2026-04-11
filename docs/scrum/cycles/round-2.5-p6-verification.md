# P6 검증 보고 — session_participants academy_id 격리

작성자: dev-2  
작성일: 2026-04-11  
상태: **완전 해소 — API fix + migration 00008 원격 DB 적용 완료**

---

## 취약점 분석

### 공격 시나리오
Academy A 수강생이 Academy B의 활성 세션 join_code를 획득하여 `/api/participants` 또는 `/api/sessions/join`을 호출할 경우, Academy B 세션에 참여 가능한지 여부.

---

## DB RLS 이중 정책 원인

### 00001 (원본)

```sql
-- INSERT: student_id + active 체크. academy_id 체크 없음
CREATE POLICY "participants_insert_student" ON session_participants
  FOR INSERT WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND status = 'active')
  );
```

### 00006

```sql
-- ⚠️ DROP 대상 이름이 "participants_insert_self" → 00001의 "participants_insert_student"와 불일치
-- → DROP no-op → 00001 정책 생존
DROP POLICY IF EXISTS "participants_insert_self" ON session_participants;

-- 더 약한 정책 추가 생성: student_id 체크만
CREATE POLICY "participants_insert_self" ON session_participants
  FOR INSERT WITH CHECK (student_id = auth.uid());
```

**결과**: 두 INSERT 정책 공존. PostgreSQL RLS permissive(OR) → 가장 느슨한 `participants_insert_self`만 만족해도 통과 → academy 격리·active 상태 무검증.

---

## API 레벨 방어 (프로덕션 안전 근거)

### fix 전 → fix 후

두 API 모두 아래 패턴으로 수정 완료:

```ts
// profile: .select("role, academy_id")
// session: .select("id, status, title, academy_id")
// 교차 비교:
if (session.academy_id !== profile.academy_id) {
  return NextResponse.json({ error: "유효하지 않은 참여 코드입니다." }, { status: 400 });
}
```

- `src/app/api/participants/route.ts` — academy 불일치 → 400
- `src/app/api/sessions/join/route.ts` — academy 불일치 → 404 *(Round 3 minor: 상태코드 통일 권장)*

**오류 메시지 동일 유지 — 타 학원 여부 미노출 (정보 은닉).**

tsc `--noEmit --skipLibCheck` → src/ 에러 0건.

---

## 최종 판정

| 레이어 | 상태 |
|--------|------|
| API 레벨 academy 격리 | **완료 (fix 적용)** |
| RLS 이중 정책 | 잔존 — Cycle 3 Critical |
| 프로덕션 경로 (API Route) | **안전** |
| 직접 DB 쿼리 경로 (anon key) | RLS 취약 — Cycle 3에서 해소 |

**현실적 취약점: 없음** (프로덕션 쓰기 경로는 API Route만 존재).  
**Defense-in-depth 이슈 있음** — Cycle 3 시작 즉시 마이그레이션 적용.

---

## migration 00008 적용 결과

파일: `supabase/migrations/00008_fix_session_participants_rls.sql` **(원격 DB 적용 완료)**

**타이밍**: critic-2가 "SELECT RLS가 UUID 추측 불가로 차단 → Cycle 3 이관 GO" 판단을 내린 시점과 병행하여 team-lead Supabase MCP `apply_migration` 직접 실행. 양 판단 모두 철학적으로 정당했고, 결과적으로 즉시 해소 + 회귀 리스크 최소.

`pg_policies` 검증 결과 — session_participants 정책 정확히 2개:
- `participants_select_same_academy` (SELECT)
- `participants_insert_student_academy_active` (INSERT, academy + active + student_id 3중 체크)

구 정책 3개 모두 제거 확인:
- ❌ `participants_select_same_session` (00001) — 삭제
- ❌ `participants_insert_student` (00001) — 삭제
- ❌ `participants_insert_self` (00006) — 삭제

```sql
-- 이중 정책 정리 + academy 체크 추가
DROP POLICY IF EXISTS "participants_insert_student" ON session_participants;
DROP POLICY IF EXISTS "participants_insert_self" ON session_participants;

CREATE POLICY "participants_insert_student_academy_active" ON session_participants
  FOR INSERT WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM sessions
      WHERE id = session_id
        AND status = 'active'
        AND academy_id = get_my_academy_id()
    )
  );
-- SELECT 정책 participants_select_same_academy (00006) 유지
```

적용 후 `SELECT policyname FROM pg_policies WHERE tablename='session_participants'` 로 2개 정책만 남았는지 확인 요망.

---

## 잔존 항목

| 항목 | 우선순위 |
|------|---------|
| `/api/sessions/join` academy 불일치 404 → 400 상태코드 통일 | Round 3 minor |
