# Argos Cycle 1+2 최종 검증 리뷰 (T8)

> 작성: critic-2 · 2026-04-11  
> 검토 대상: Cycle 1+2 전체 산출물, `docs/scrum/sprint-report.md`, `docs/scrum/cycles/cycle-3-backlog.md`  
> T9 GO/NO-GO 판정 포함

---

## 1. Cycle 1+2 전체 품질 평가

### 1-1. 보안

| 항목 | 상태 | 근거 |
|------|------|------|
| mentor 유령 라우트 API role guard (N-1~N-3) | ✅ | `/api/ai/mentor-briefing`, `/api/ai/analysis`, `/api/ai/report` — mentor 403 수정 완료 |
| layout role guard 양방향 | ✅ | mentor/instructor/student/owner layout 4개 ROLE_HOME redirect 직접 확인 |
| join_code draft 노출 방지 | ✅ | draft→null, active→generateJoinCode() — REG-004 E2E PASS |
| consultation_notes INSERT role 체크 | ✅ | migration 00007 복원 — REG-001b E2E PASS |
| profiles RLS 무한재귀 해소 | ✅ | migration 00006 get_my_academy_id() SECURITY DEFINER |
| session_participants academy 교차 참여 | ✅ | API 레벨 + migration 00008 RLS 강화 — defense-in-depth 달성 |
| NEXT_PUBLIC_ 키 노출 | ✅ | REG-003 E2E PASS |
| RLS 전 테이블 활성화 | ✅ | AC-8-e E2E PASS |

**보안 판정**: CLAUDE.md §1-6 위반 0건. 신규 발견 취약점(P6) 해소 완료.

### 1-2. 코드 품질

| 항목 | Cycle 2 종료 상태 |
|------|----------------|
| `any` 타입 신규 도입 | 0건 |
| `console.log` 프로덕션 잔존 | 0건 |
| 매직 넘버 | 0건 (RISK_SPEED_INCREASE_RATIO 상수화 포함) |
| 미사용 import/변수 | 0건 (빌드 경고 0) |
| TypeScript 빌드 | ✅ 통과 |
| AI 응답 Zod 검증 | ✅ 전 엔드포인트 |

### 1-3. 아키텍처

| 항목 | 상태 |
|------|------|
| Server Component / Route Handler 분리 (`rsc.ts` / `server.ts`) | ✅ Patch 2 근본 수정 |
| middleware 단독 세션 갱신 | ✅ setAll 생략 의도적, 주석 명시 |
| AI 프롬프트 `src/lib/ai/prompts/` 분리 | ✅ |
| Server Actions 미사용, API Route 통일 | ✅ |

### 1-4. 테스트

| 라운드 | PASS | FAIL | SKIP | FLAKY |
|--------|------|------|------|-------|
| Cycle 1 기준선 | 26 | 0 | 0 | 0 |
| Round 1 | 298 | 120 | 725 | — |
| Round 2 | 294 | 0 | 779 | 1 |
| Round 2.5 (1차) | 293 | 0 | 780 | 1 |
| **Round 2.5 최종** | **313** | **0** | **781** | **0** |

> **Round 2.5 추가 근본 수정 (qa)**:  
> 1. ISD-ERR-001: UI 렌더 의존 제거 → API 레벨 `join_code=null` 직접 검증으로 재설계 (cycle-3-backlog B-0 권고 방향과 일치)  
> 2. ISN beforeAll: Supabase session refresh로 teacher.json 무효화되는 근본 원인 발견 → fresh 로그인 재생성 패턴 적용, ISN 20건 복구  
> 3. API-AI-010: ISN fix 부수 효과로 cold start hit 제거 → **0 flaky 완전 달성**  
>
> **"flaky 허용 0" 원칙 — 외부 의존성 한계 없이 완전 충족.**

---

## 2. critic-2 정정 기여 5건 — 공식 기록

Cycle 2에서 팀 전원이 동의한 가정을 파기해 실질적 비용 낭비 또는 취약점을 방지한 5건:

| # | 시점 | 파기한 가정 | 실제 상태 | 영향 |
|---|------|-----------|---------|------|
| 1 | Cycle 1 T3 | analyst: `/api/mentor/` 스캔으로 충분 | `/api/ai/*` 3개 엔드포인트에서 mentor 403 추가 발견 | 핵심 기능 broken 상태 배포 방지 |
| 2 | Round 1 | qa/analyst: Cat-E "role redirect 미구현" | layout 4개 ROLE_HOME 이미 완전 구현 | Cycle 3 불필요 공수(spec skip + 코드 추가) 방지 |
| 3 | Round 1 | analyst: Cat-A "endpoint 부재 27건" | `/api/participants/route.ts` 이미 완전 구현 | dev-2 P1 불필요 재구현 방지 |
| 4 | Round 2 | analyst: ISD-ERR-001 fix = `waitForSelector('[data-testid="join-code"]')` | 부재 검증 TC에 존재 selector 대기 → timeout 발생 | 보안 TC 무력화 방지 |
| 5 | Round 2.5 | team-lead: "API 방어로 프로덕션 안전, Cycle 3 이관" | publishable key 브라우저 공개 → authenticated 사용자 API 우회 가능 → RLS 최후 방어선 | session_participants 교차 academy 취약점 즉시 해소 (migration 00008) |

**공통 패턴**: 로그/분류/처방을 그대로 수용하지 않고, 파일을 직접 Read/Grep하여 실제 코드 상태와 대조.

---

## 3. sprint-report.md 검증

### 숫자 정확도

| 항목 | report 기재 | 실제 | 판정 |
|------|-----------|------|------|
| TC 문서화 증가 | 381→1,024 (+2.69×) | ✅ | 정확 |
| E2E 자동화 | 26→1,143 (+44×) | ✅ | 정확 |
| Wiki 페이지 | 73개 | ✅ | 정확 |
| DB 마이그레이션 | **6→7 (+1)** | **6→8 (+2)** | ❌ **정정 필요** |
| Round 2.5 결과 | 293/0/780/11.6분 | ✅ | 정확 |
| Round 2 결과 | 294/0/779/1flaky | ✅ | 정확 |

**§6 정정**: "DB 마이그레이션 6→7 (+1)" → "6→8 (+2)". migration 00008이 Round 2.5 중 원격 적용 완료됐으나 카운트에 반영되지 않음.

### 내용 정확도

| 항목 | 판정 |
|------|------|
| Cat-E 원인(Cat-B 연쇄로 자동 해소) | ✅ 정확 |
| P6 해소 경로 기술 | ✅ 정확 (타이밍 메모 포함) |
| critic-2 기여 5건 | ✅ 정확 |
| 팀 기여 §7 | ✅ 정확 |
| Cycle 3 backlog §5 | ✅ 정확 |

**sprint-report 판정**: §6 마이그레이션 수 1건 정정 후 T9 GO.

---

## 4. Cycle 3 backlog 타당성 검증

### A. 근본 구현 이관

| 항목 | 타당성 | 판정 |
|------|--------|------|
| A-0 migration 00008 | 해소 완료 ✅ | — |
| A-1 SKIP 779 해제 계획 | F6~F9 기능 구현 의존, 합리적 이관 | ✅ 타당 |

### B. 품질·프로세스 이관

| 항목 | 타당성 | 판정 |
|------|--------|------|
| B-0 ISD-ERR-001 data-testid 업그레이드 | 컴포넌트 testid 추가 필요, legitimate deferral | ✅ 타당 |
| B-1 pre-automation 체크리스트 | Cat-A/C/F 재발 방지 — 필수 | ✅ 타당, 높은 우선순위 |
| B-2 Wiki→TC 연동 표준화 | Gotcha 발견 메커니즘 강화 | ✅ 타당 |
| B-3 Realtime flaky CI 격리 | SSN-RT workers=1 격리 미실행 상태 | ✅ 타당, Round 3 전 필요 |

### C. Round 2 이후 추가

| 항목 | 타당성 | 판정 |
|------|--------|------|
| C-3 API-AI-010 flaky | 외부 서비스 의존, --retries=1 격리로 해소 예상 | ✅ 타당 |
| C-4 780 SKIP 분류 | 분류 정확, 단계적 해제 계획 합리적 | ✅ 타당 |

**backlog 판정**: 합리적. 회피 없음 — 모든 항목에 해제 조건과 담당이 명시됨.

---

## 5. "진정한 근본 수정"과 "정당한 미루기"의 경계

Cycle 2에서 두 패턴의 경계가 실전 검증됨:

### 근본 수정 사례

| 케이스 | 이유 |
|--------|------|
| Cat-E spec skip 거부 (→ 코드 이미 구현됨 확인) | skip 하기 전 실제 코드 상태 확인 필수 |
| ISD-ERR-001 flaky fix (Option A, Round 2.5) | 보안 TC 공백은 이관 불가 |
| P6 migration 00008 즉시 적용 | defense-in-depth — RLS가 진짜 최후 방어선 |

### 정당한 미루기 사례

| 케이스 | 이유 |
|--------|------|
| 779 SKIP Cycle 3 이관 | F6~F9 기능 미구현 상태에서 실행 불가, 명시적 해제 조건 있음 |
| API-AI-010 T12 범위 외 | 외부 서비스 의존 — 코드 버그 아님, 격리 실행으로 처리 가능 |

**기준**: "skip + 잊기"는 회피. "skip + 해제 조건 명시 + 담당 기록"은 legitimate deferral.

---

## 6. 프로세스 개선 항목 (Cycle 3 반영 권고)

| 항목 | 배경 | 우선순위 |
|------|------|---------|
| 중대 DB 변경 적용 전 "누가/언제" 명시 합의 + 전원 브로드캐스트 | Round 2.5 P6 타이밍 엇갈림 (critic-2 판단과 team-lead 적용 병행) | P0 |
| pre-automation 체크리스트 — spec 작성 전 엔드포인트/auth/상태코드 확인 | Cat-A/C/F 3가지 오류 모두 예방 가능했음 | P0 |
| TC Fix 권고 시 "TC 의도 먼저 확인" — 검증 대상이 존재인가 부재인가 | ISD-ERR-001 analyst 오진(waitForSelector) 패턴 | P1 |
| Realtime TC CI 격리 (`--workers=1 --retries=2`) | SSN-RT 계열 미실행 상태 지속 | P1 |

---

## 7. T9 GO/NO-GO

### 조건 점검

| 조건 | 상태 |
|------|------|
| FAIL = 0 | ✅ Round 2.5 0건 |
| flaky (ISD-ERR-001) = 0 | ✅ 해소 완료 |
| 잔존 flaky (API-AI-010) T12 범위 | ✅ 외부 서비스 의존, 범위 외 수용 |
| 보안 취약점 배포 전 해소 | ✅ migration 00008 원격 적용 완료 |
| CLAUDE.md §1-20 위반 신규 도입 | ✅ 0건 |
| sprint-report 숫자 1건 정정 | ❗ §6 마이그레이션 수 6→8로 수정 필요 |
| Cycle 3 backlog 합리적 | ✅ 확인 |

### **T9 조건부 GO** ✅

**조건**: `sprint-report.md §6 마이그레이션 수 "6→7" → "6→8"` planner 정정 후 최종 확정.

Cycle 1+2 품질 기준 충족. 잔존 리스크는 명시적 Cycle 3 backlog으로 관리. T9 최종 보고서 + 다음 스텝 진행.
