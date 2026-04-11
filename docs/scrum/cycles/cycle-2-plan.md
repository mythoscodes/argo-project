# Cycle 2 기획 (planner)

작성일: 2026-04-11  
작성자: planner  
근거 자료: `cycle-1-analysis.md` (analyst-2), `cycle-1-critique.md` (critic-2), T7 실행 결과 (26/26 PASS, 24.1s)

---

## 1. Cycle 1 회고 요약

### 성과

| 항목 | 결과 |
|------|------|
| E2E 통과율 | 26/26 = **100%** (2회 연속 확인) |
| AC-1~8 | **전부 GREEN** |
| AC-8 위반 | **0건** (`any` 0, `console.log` 0, 매직넘버 0) |
| 문서화 TC | 381개 |
| 자동화 TC | 26개 (커버리지 6.8%) |

### 핵심 교훈 (Cycle 2 반영 기준)

| 분류 | 교훈 |
|------|------|
| 분석(A-1) | `/api/ai/` 연결 API 추적 누락 → 기능-API 연결 그래프 추적 필수화 |
| 분석(A-2) | `src/app/*/layout.tsx` 전체 glob 미실시 → 체크리스트 1번 항목 고정 |
| Dev(D-1) | 원격 마이그레이션 미적용으로 E2E 전체 실패 → `supabase db push` 사전 확인 표준화 |
| Dev(D-3) | `global-setup.ts` warm-up 없이 26개 규모는 무사했으나 1,143개 규모에선 flaky 발생 가능 |
| QA(Q-1) | 관례 셀렉터 사용 → 스펙 작성 전 `.tsx` 파일 Read 필수 |
| QA(Q-2) | charset 정규식 오류 → `constants.ts` 우선 참조 필수 |

---

## 2. 미결정 정책 확정

### mentor 세션 접근 범위

**결정: 학원 내 전체 세션(academy_id 기반)으로 정책화**

- Cycle 1 T4에서 `academy_id` 기반으로 임시 처리한 것을 공식 정책으로 확정
- 근거: mentor는 학원 단위 모니터링 역할 — 특정 세션 배정 없이 학원 전체를 조망해야 데이터가 의미 있음
- 구현 현황: `mentor-briefing/route.ts`가 이미 `academy_id` 기반으로 동작 중 → 변경 불필요
- TC 반영: `MLS-API-001~003`, `MSD-API-001~003`에 "학원 내 전체 세션 접근 가능, 타 학원 세션 RLS 차단" 명시

---

## 3. Cycle 2 작업 순서 (의존성 기반)

```
[선행] dev-2: global-setup warm-up 패치
         ↓
T10: TC 시트 3배 확장 (planner 8화면 + analyst-2 6화면, 병렬)
         ↓
T11: Playwright 스펙 100% 자동화 (qa, T10 완료 후)
         ↓
T12: all-pass 반복 실행 루프 (qa + dev-2, T11 완료 후)
```

**선행 조건 (T10 착수 전):**
- dev-2가 `global-setup.ts` warm-up 패치 완료
- `playwright.config.ts`에 `workers: 4` 추가
- `supabase db push --dry-run` 로컬/원격 drift 0 확인

---

## 4. T10 — TC 시트 3배 확장 담당 분배

### planner 담당 (8화면, 목표 ~633 TC)

| 화면 | 접두사 | 현재 | 목표 | 중점 확장 항목 |
|------|-------|------|------|----------------|
| `/` | `CMN` | 9 | 27 | mentor 분기 추가, 세션 만료 조합, 알 수 없는 role 엣지 |
| `/login` | `LGN` | 18 | 54 | 인증 컨텍스트 조합, rate limit, 네트워크 에러, mentor 분기, 자동완성 접근성 |
| `/register` | `REG` | 25 | 75 | mentor 가입 플로우, 경계값(길이/형식), XSS, DB 롤백 시나리오 |
| `/instructor` | `IDB` | 19 | 57 | RLS 교차(타 학원), 정렬 안정성, Realtime 세션 변동(Could), 접근성 |
| `/instructor/sessions/new` | `ISN` | 25 | 75 | 태그 엣지(100개/특수문자), 중복 제출, 네트워크 에러, 접근성 |
| `/instructor/sessions/[id]` | `ISD` | ~65 | 195 | Realtime 역전/누락, 퀴즈-응답 동시성, 히트맵 에러, AI 재시도 |
| `/instructor/sessions/[id]/reports` | `ISR` | 22 | 66 | silent failure 보강, 차트 엣지, AI 응답 검증 실패 시나리오 |
| `/owner` | `ODB` | 28 | 84 | RLS 교차 엄격화, 빈 학원 엣지, 차트 과밀(30개↑), 접근성 |
| **합계** | | **~211** | **~633** | |

### analyst-2 담당 (6화면, 목표 ~510 TC)

| 화면 | 접두사 | 현재 | 목표 |
|------|-------|------|------|
| `/student/join` | `SJN` | 25 | 75 |
| `/student/sessions/[id]` | `SSN` | 33 | 99 |
| `/student/sessions/[id]/result` | `SSR` | 22 | 66 |
| `/student/sessions/[id]/report` | `SSP` | 22 | 66 |
| `/mentor` | `MLS` | 26 | 78 |
| `/mentor/students/[id]` | `MSD` | 42 | 126 |
| **합계** | | **170** | **510** |

### TC 3배 확장 시 추가할 디테일 10가지

모든 화면에서 우선순위 순으로 적용:

| # | 항목 | 예시 |
|---|------|------|
| 1 | 경계값 | 이름 50자/51자, 비밀번호 5자/6자, 태그 0/100개 |
| 2 | 인증 컨텍스트 조합 | 쿠키 만료 중간, 세션 갱신 실패, 다중 탭 |
| 3 | 네트워크 에러 | 오프라인, 504, 응답 지연 10s |
| 4 | Realtime 엣지 | 메시지 역전, 채널 재연결, TIMED_OUT |
| 5 | 접근성 | 키보드 전용 네비게이션, ARIA role/label, 스크린리더 |
| 6 | 한국어 메시지 정확성 | 에러 문구 정확한 텍스트 매칭 |
| 7 | RLS 교차 | 타 학원 동일 role로 직접 URL 접근 |
| 8 | XSS/SQL injection | `<script>`, `'; DROP TABLE`, `{{7*7}}` |
| 9 | 레이트 리밋 | Supabase Auth 레이트 리밋 응답 처리 |
| 10 | 뒤로/새로고침 | 폼 제출 후 뒤로, 자동 로그인 후 새로고침 |

---

## 5. T11 — Playwright 스펙 100% 자동화

### 파일 구조 (qa 권장)

```
tests/e2e/
├── ui/
│   ├── common-home.spec.ts
│   ├── login.spec.ts
│   ├── register.spec.ts
│   ├── instructor-dashboard.spec.ts
│   ├── instructor-session-new.spec.ts
│   ├── instructor-session-detail.spec.ts
│   ├── instructor-session-reports.spec.ts
│   ├── student-join.spec.ts
│   ├── student-session.spec.ts
│   ├── student-result.spec.ts
│   ├── student-report.spec.ts
│   ├── mentor-list.spec.ts
│   ├── mentor-student-detail.spec.ts
│   └── owner-dashboard.spec.ts
├── api/
│   ├── auth.spec.ts       (register/login API 계약)
│   ├── sessions.spec.ts
│   ├── ai.spec.ts
│   └── dashboard.spec.ts
├── realtime/
│   ├── quiz-broadcast.spec.ts
│   └── heatmap-update.spec.ts
└── regression/
    ├── join-code.spec.ts       (REG-ERR-001)
    ├── rls-isolation.spec.ts   (ODB-ERR-001/002, IDB-ERR-001)
    ├── mentor-routing.spec.ts  (CMN-ERR-002, LGN-ERR-003)
    └── constants.spec.ts       (RISK_SPEED_INCREASE_RATIO 상수화)
```

### QA 스펙 작성 체크리스트 (Cycle 1 Q-1/Q-2 교훈)

1. 스펙 작성 전 대상 `.tsx` 파일 Read — 실제 `id`/`name`/`data-testid` 확인
2. 상수값은 `src/lib/constants.ts` 참조 — 하드코딩 금지
3. charset/정규식은 실제 생성 함수 기준 작성 (`generateJoinCode()` 등)
4. RLS 교차 케이스: 계정 A/B 두 개 생성 후 A 세션을 B로 접근하는 패턴 포함

---

## 6. T12 — all-pass 반복 실행 루프

### 루프 정책

```
Round N 시작
  → dev-2: global-setup warm-up + 마이그레이션 동기화 확인
  → qa: npm run test:e2e 전체 실행
  → 실패 0건이면 → Cycle 완료
  → 실패 있으면:
      분류(환경/코드/스펙/flaky)
      → 코드 버그: dev-2 수정 → 해당 스펙만 재실행 확인 → 전체 재실행
      → 스펙 오류: qa 수정 → 전체 재실행
      → 환경: supabase db push → 전체 재실행
      → flaky: 원인 분석 후 global-setup warm-up 보강 또는 retry 설정
  → Round N+1
```

### 실행 환경 설정

```ts
// playwright.config.ts Cycle 2 추가 사항
workers: process.env.CI ? 1 : 4,        // 로컬 4병렬, CI 단일
retries: 0,                              // flaky 허용 안 함 (AC-7)
timeout: 30_000,                         // 개별 테스트 30s
globalSetup: './tests/e2e/global-setup.ts',
```

### 실행 시간 예상

| workers | 예상 총 시간 |
|---------|------------|
| 1 (현재) | ~1,056s (~18분) |
| 4 (Cycle 2) | ~264s (~4.5분) |
| 8 | ~132s (~2.2분, 메모리 제약 주의) |

---

## 7. Round별 회고 체인

Cycle 2에서 T12 루프가 반복될 때마다:

```
analyst-2 → docs/scrum/cycles/round-{N}-analysis.md
critic-2  → docs/scrum/cycles/round-{N}-critique.md
planner   → docs/scrum/cycles/round-{N}-plan.md (다음 Round 계획)
```

**에스컬레이션 정책:**
- Round 3 이후에도 동일 코드 버그 반복: dev-2 + planner 긴급 회의 (team-lead 알림)
- 환경 이슈 반복: CI/CD 구성 검토 (Out of Scope 재확인 후 team-lead 판단)

---

## 8. Context7 라이브러리 ID 프리셋

Cycle 2에서 자주 참조할 라이브러리 (각 팀원 공유):

| 라이브러리 | Context7 ID |
|-----------|------------|
| Playwright | `/microsoft/playwright.dev` |
| Next.js | `/vercel/next.js` |
| Supabase SSR | `/supabase/ssr` |
| Vercel AI SDK | `/vercel/ai` |
| React Testing | `/testing-library/react-testing-library` |

---

## 9. Cycle 2 시작 체크리스트

T10 착수 전 완료 필수:

- [x] dev-2: `global-setup.ts` warm-up 구현 — `waitForServer()` 폴링 추가 (2026-04-11)
- [x] dev-2: `playwright.config.ts`에 `workers: process.env.CI ? 1 : 4`, `timeout: 30_000` 추가 (2026-04-11)
- [x] dev-2: `supabase db push --dry-run` 로컬/원격 drift 확인 절차 표준화 (하단 참조)
- [ ] planner + analyst-2: T10 병렬 시작 (각자 담당 화면)
- [x] mentor 세션 접근 정책 문서화 완료 (본 문서 §2)

### `supabase db push --dry-run` 표준 절차

`npm run test:e2e` 실행 전 매 Round마다:

```bash
# 1. 원격 DB와 로컬 마이그레이션 drift 확인
supabase db push --dry-run

# 출력 예시 (drift 없음):
#   No changes found. Your database is up to date.

# drift 있으면 실제 적용:
supabase db push
```

**판단 기준:**
- `No changes found` → 테스트 진행
- 변경 있으면 → `supabase db push` 적용 후 재확인 → 테스트 진행
- 로컬 함수(`get_my_role`, `get_my_academy_id`) 없으면 migration 00006 미적용 → 즉시 push (Cycle 1 D-1 교훈)

---

## 10. Round 1 예상 Failure 패턴 & Fix 우선순위

> Round 1 실행 후 planner가 이 표를 기준으로 다음 Round 기획. analyst-2 분석 → critic-2 비평 → planner Round N+1 plan 루틴.

### 예상 실패 카테고리 (8화면 TC 분석 기반)

| 우선순위 | 카테고리 | 예상 실패 TC | 근거 |
|---------|---------|------------|------|
| P0 | RLS 교차 검증 | ISD-ERR-002/003, ODB-ERR-001/002, IDB-ERR-001/008 | 타 학원 직접 URL 접근 — E2E 환경에서 계정 2개 필요, 미구현 시 전부 실패 |
| P0 | mentor 라우팅 회귀 | CMN-ERR-002, LGN-ERR-003, REG-ERR-003 | Cycle 1 수정 완료지만 regression spec 커버 여부 확인 필요 |
| P1 | `join_code` draft null | ISD-ERR-001, ISD-API-006, ISN-API-005 | T7-hotfix 적용 완료이나 Playwright 검증 셀렉터 정확성 필요 |
| P1 | XSS/SQL injection | CMN-ERR-009, LGN-ERR-009/010, ISN-ERR-007/008 | 실제 `<script>` 입력 후 DOM 확인 필요 — Playwright evaluate 활용 |
| P2 | 접근성 ARIA | LGN-ERR-017, ISN-ERR-011, ODB-ERR-014/015 | `aria-*` 속성 자동화는 `getByRole` 활용 — 현재 구현에 없을 수 있음 |
| P2 | 경계값 | REG-UI-017/018, ISN-UI-014/015, ODB-UI-020/021 | Zod 서버 검증은 통과 예상, UI 측 제한 없으면 통과 |
| P3 | 네트워크 에러 | LGN-ERR-004, ISN-ERR-005, ISR-ERR-009 | Playwright `page.route()` 모킹 필요 — 스펙 미구현 시 skip |
| P3 | 레이트 리밋 | LGN-ERR-005/008, REG-API-017 | Supabase staging 환경에서 실제 트리거 어려움 — mock 또는 skip |

### Round별 Fix 우선순위 정책

```
Round 1 실패 분류 시:

1) 환경 이슈 (마이그레이션, 서버 미기동)
   → dev-2: supabase db push + 서버 확인 → 전체 재실행
   → 코드 변경 없음

2) P0 코드 버그 (RLS 실패, mentor 라우팅 회귀, join_code 노출)
   → dev-2: 즉시 수정 → 해당 스펙 단독 실행 확인 → 전체 재실행
   → planner: Round N+1 plan에 수정 내용 반영

3) P1 스펙 오류 (셀렉터 미매칭, 정규식 오류)
   → qa: 스펙 수정 → 전체 재실행
   → planner: 스펙 오류 패턴을 Round N+1 QA 체크리스트에 추가

4) P2 기능 갭 (ARIA 미구현, 접근성 속성 없음)
   → 데모 필수 여부 판단: Must이면 dev-2 구현, Should/Could이면 해당 TC skip
   → planner: skip 목록 Round N+1 plan에 명시

5) P3 환경 의존 (레이트 리밋, 네트워크 모킹)
   → qa: `test.skip()` 처리, 별도 manual TC로 분류
   → planner: 자동화 불가 TC 목록 관리
```

### Failure 발생 시 에스컬레이션

- Round 3 이후에도 동일 P0 버그 반복 → team-lead 알림 + 원인 분석 회의
- 전체 실패율 > 30% → 환경 이슈 우선 점검 (D-1 교훈 적용)
- flaky(retry 후 pass) 발생 → warm-up 로직 보강 또는 `waitFor` 타임아웃 증가

---

## 11. Definition of Done (Cycle 2)

1. TC 문서 총 계수 1,143개 이상 (planner 633 + analyst-2 510)
2. `npm run test:e2e` 전체 1,143개 PASS (실패 0, flaky 0)
3. 회귀 스펙 4건 (`join-code`, `rls-isolation`, `mentor-routing`, `constants`) 전부 GREEN
4. Round별 회고 파일 생성 완료
5. planner가 `docs/scrum/cycles/cycle-2-report.md` 최종 보고서 작성
