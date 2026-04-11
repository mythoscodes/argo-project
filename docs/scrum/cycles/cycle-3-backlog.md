# Cycle 3 Backlog (Cycle 2 이관분)

작성자: planner  
작성일: 2026-04-11  
상태: 확정 — Round 2 완료 (294 pass / 0 fail)

---

## 정책

**이관 기준**: Cycle 2에서 "의도적 skip + Cycle 3 이관"으로 공식 결정된 항목만 포함.  
**회피 금지**: skip + 잊기 = 회피. 이 문서에 기록된 항목은 Cycle 3에서 반드시 재검토.  
**우선순위**: P0(보안) > P1(기능) > P2(UX) 순.

---

## A. 근본 구현 이관

### A-0. ~~[P0 CRITICAL] migration 00008 원격 DB 적용~~ — ✅ Cycle 2 Round 2.5에서 해소 완료 (team-lead 원격 적용)

**완료**: team-lead Supabase MCP `apply_migration` 직접 실행 + `pg_policies` 검증 완료.

**현재 `session_participants` 정책 (2개)**:
1. `participants_select_same_academy` (SELECT, academy_id)
2. `participants_insert_student_academy_active` (INSERT, student + active + academy 3중 체크)

**타이밍 메모**: critic-2가 "SELECT RLS가 UUID 추측 불가로 차단 → Cycle 3 이관 GO" 판단 변경과 team-lead의 원격 적용이 병행 발생. 양 판단 모두 철학적으로 정당했고, 결과적으로 defense-in-depth 자동 달성.

**파일**: `supabase/migrations/00008_fix_session_participants_rls.sql`  
**상세**: `docs/scrum/cycles/round-2.5-p6-verification.md`  
**Cycle 3 잔존 작업**: 없음

---

### A-1. [Optional] AI 스텁 전용 모드 도입 — 미래 안전 대비

**배경**: Round 2.5 final에서 API-AI-010 flaky가 ISN beforeAll fresh 로그인 패턴으로 사라짐. qa fix로 teacher 세션 무효화 방지 → Gemini cold start hit 우연 제거됨. **현재 0 flaky 달성으로 필수 아님.**

**Cycle 3 도입 권고 (Optional)**:
- 환경변수 `E2E_STUB_MODE=true` 시 AI 엔드포인트 자동 스텁
- Gemini 외부 의존성 원천 차단 → CI 환경에서 장기적 안정성 보장
- 미래 cold start 문제 재발 방지용 defense-in-depth

**우선순위**: Optional (Cycle 3 E2E 안정화 트랙 — 필요 시 도입)  
**담당**: dev-2 + qa

---

### A-2. SKIP 780 구조적 해소 — Cycle 3 이관

**배경**: Round 2 최종 779 SKIP 잔존. Round 2.5(flaky fix)에서도 SKIP은 건드리지 않음. 전량 Cycle 3 이관.

**Round 2 확정 분류**:

| 분류 | 건수 | Cycle 3 처리 |
|------|------|------------|
| WebSocket Realtime (SSN-RT 계열) | ~40 | Realtime 격리 CI 안정 확인 후 skip 해제 |
| AI 응답 검증 | ~80 | AI 파이프라인 안정화 후 해제 |
| mentor 통합 | ~60 | F9 구현 완료 후 해제 |
| 대용량/부하 | ~30 | 별도 부하 테스트 환경 구축 후 해제 |
| 기타 의도적 skip (F6~F9 미구현) | ~569 | 기능 구현 완료 후 단계적 해제 |

**해제 우선순위**:
1. F6 피드백루프 구현 → 관련 skip ~100건 해제
2. F7 리포트 구현 → 관련 skip ~80건 해제
3. F8/F9 구현 → mentor/owner 관련 skip ~120건 해제
4. Realtime CI 격리 안정화 → SSN-RT ~40건 해제

---

## B. 품질·프로세스 이관

### B-0. ISD-ERR-001 join_code 단언 업그레이드 (Cycle 3 권고)

**배경**: Round 2.5에서 ISD-ERR-001 `waitForLoadState('networkidle')` → React hydration 완료 비보장 → false negative 원인 확정 (analyst-2). Round 2.5에서 `toBeVisible` 명시적 대기로 flaky 해소.

**Cycle 3 업그레이드 권고 (analyst-2)**:
```typescript
// 현재 (Round 2.5 fix)
await expect(page.getByText('수업을 시작하면')).toBeVisible({ timeout: 5_000 });

// Cycle 3 목표 — data-testid 직접 검증 (보안 명시적 단언)
await expect(page.getByTestId('join-code')).not.toBeVisible(); // draft 상태
await expect(page.getByTestId('join-code')).toBeVisible();     // active 상태
```

**전제**: 프론트엔드에 `data-testid="join-code"` 속성 추가 필요 (dev-2 또는 프론트엔드 담당).

---

### B-1. pre-automation 체크리스트 공식화

**배경**: Cat-A(엔드포인트 없음), Cat-C(auth 상속), Cat-F(상태코드)는 모두 spec 작성 시 구현체와 동기화 부재로 발생.

**Cycle 3에서 도입할 체크리스트** (qa 담당):
```
spec 작성 전 확인 항목:
[ ] 1. 대상 엔드포인트가 src/app/api/ 에 실제 존재하는가?
[ ] 2. auth 상속 방식: test.use() storageState인가? → 미인증 테스트는 request.newContext() 별도 생성
[ ] 3. 응답 상태코드를 route.ts에서 직접 확인했는가?
[ ] 4. 응답 필드명(camelCase vs snake_case)을 API 코드에서 확인했는가?
```

**문서 위치**: `docs/scrum/process-qa-pre-automation.md` (Cycle 3에서 생성)

---

### B-2. Wiki → TC 연동 표준화

**배경**: T15 Wiki 작성 중 코드 리스크 3건 사전 발견 → 1건 Round 1에서 직접 확정(Cat-D). 이 접근법을 표준 절차로.

**표준화 항목**:
- Wiki `Gotchas` 섹션 작성 시 관련 TC ID 명시 (`ISN-API-005`, `ISD-ERR-001` 등)
- TC 시트 작성 시 Wiki `Gotchas`를 참조 소스로 포함
- Wiki 수정 시 연관 TC 재검토 의무화

**담당**: planner (규칙 문서화), analyst-2 (Wiki 작성 시 적용)

---

### B-3. Realtime flaky TC 격리 실행 표준화

**배경**: SSN-RT-006~015 (CHANNEL_ERROR/TIMED_OUT)는 네트워크 타이밍 의존. Round 1에서 auth 문제로 실행조차 안 됨. flaky 여부 미확인.

**Cycle 3 표준**: Realtime/rate-limit 계열 TC를 CI 별도 job으로 분리
```bash
# 별도 구간: workers=1, retries=2
npx playwright test --grep "SSN-RT|SSP-RL|MSD-RL" --workers=1 --retries=2
```

**문서 위치**: `docs/scrum/process-ci-flaky.md` (Cycle 3에서 생성)

---

## C. Round 2 이후 추가 예정

> 이 섹션은 Round 2 결과 수신 후 채워짐.

### C-1. Round 2 신규 실패

**없음.** Round 2 최종 결과: **294 passed / 0 failed / 779 skipped / 1 flaky** (18.7분)

Cat-A(27건), Cat-B(22건), Cat-G 기타 대부분이 auth 만료 연쇄였음이 확인됨. P0 정상화만으로 전부 해소.

### C-2. Wiki 선제 발견 Gotcha 1/2 재검증

Round 2 FAIL 0건으로 별도 재검증 불필요. 해당 Gotcha는 wiki 문서(rls-sessions, component-delta-chart)에 기록된 상태로 유지.

### C-3. API-AI-010 flaky — Gemini cold start

**배경**: Round 2.5 최종 실행에서 잔존 flaky 1건. Gemini cold start 기인 네트워크/외부 서비스 의존 타이밍 — pre-existing, ISD-ERR-001과 무관.

**T12 종료 조건**: 무관 (외부 서비스 의존, Round 2.5 통과 기준 외)

**Cycle 3 처리**: AI 파이프라인 안정화 또는 `--retries=1` 격리 후 해소

---

### C-4. 780 SKIP — Round 3 해제 대상 분류

Round 2.5 최종 확정 (780 SKIP):

| 분류 | 건수 |
|------|------|
| WebSocket Realtime (SSN-RT 계열) | ~40 |
| AI 응답 검증 | ~80 |
| mentor 통합 | ~60 |
| 대용량/부하 | ~30 |
| 기타 의도적 skip | ~569 |

Round 3 기능 구현(F6~F9) 완료 후 단계적 skip 해제 예정.

---

## D. 현황 요약

| 항목 | 건수/상태 | Cycle 3 우선순위 |
|------|---------|--------------|
| ~~migration 00008 적용 (P6 RLS)~~ | **✅ 완료** | Round 2.5에서 해소 |
| 의도적 SKIP 해제 | ~200건 | P2 (기능 구현 후) |
| pre-automation 체크리스트 | 프로세스 | P1 |
| Wiki→TC 연동 표준화 | 프로세스 | P2 |
| Realtime flaky 격리 CI | 인프라 | P2 |
| Round 2 신규 실패분 | (미정) | P0 if RLS 관련 |

---

## Changelog

- 2026-04-11 초판 (planner) — Cat-E, SKIP 구조, 프로세스 이관분 정리
- 2026-04-11 갱신 (planner) — Cat-E A-1 제거: critic-2 확인 결과 4개 layout 모두 role guard + ROLE_HOME redirect 이미 구현됨. Round 1 Cat-E 10건은 Cat-B auth 만료 연쇄였음
- 2026-04-11 갱신 (planner) — Round 2 결과 반영: C섹션 채움 (294 pass / 0 fail / 779 skip / 1 flaky), 상태 확정
- 2026-04-11 갱신 (planner) — A-1 SKIP 725→779로 업데이트, Round 2 확정 분류 반영, Round 2.5 SKIP 미처리 명기
- 2026-04-11 갱신 (planner) — A-0 [CRITICAL] 추가: migration 00008 P0, critic-2 GO, dev-2 작성 완료
- 2026-04-11 갱신 (planner) — A-0 상태 "✅ Cycle 2 Round 2.5 해소 완료"로 변경 (team-lead MCP 원격 적용 완료, pg_policies 검증 완료). Cycle 3 잔존 없음. 타이밍 메모 추가.
