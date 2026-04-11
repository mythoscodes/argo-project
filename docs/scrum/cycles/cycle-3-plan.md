# Cycle 3 Plan

작성자: planner  
작성일: 2026-04-11  
기반: `cycle-3-backlog.md` + Cycle 2 Round 2.5 final (313/0/0/781)  
원칙: **all pass 유지 — FAIL = 0, flaky = 0 매 Round 확인**

---

## 0. 기준선

| 지표 | Cycle 2 종료 시점 |
|------|-----------------|
| Passed | 313 |
| Failed | 0 |
| Flaky | 0 |
| Skipped | 781 |
| Duration | 3.3분 |

Cycle 3 모든 Round는 이 기준선을 유지하면서 개선 사항을 점진 추가한다.

---

## 1. 3-Gate 구조

```
Round 3.1 (보안·안정화)
    ↓ FAIL=0, flaky=0 확인
Round 3.2 (프로세스 문서화)
    ↓ FAIL=0, flaky=0 확인
Round 3.3 (SKIP 해제, 선택적)
    ↓ FAIL=0, flaky=0 확인
Cycle 3 완료
```

각 Gate 통과 조건: `npm run test:e2e` 전체 재실행 FAIL=0, flaky=0.

---

## 2. Round 3.1 — 보안·안정화 (우선순위 높음)

### 2-1. B-0: ISD-ERR-001 `data-testid` 직접 검증 업그레이드

**목표**: join_code 노출 여부를 문구 매칭(`toContainText`)에서 `data-testid` 직접 검증으로 교체 → 명시적 보안 단언

**담당**:
- dev-2: `src/app/instructor/sessions/[id]/page.tsx` join_code 렌더 지점에 `data-testid="join-code"` 추가
- qa: spec 업그레이드
  ```typescript
  // draft 상태
  await expect(page.getByTestId('join-code')).not.toBeVisible();
  // active 상태
  await expect(page.getByTestId('join-code')).toBeVisible();
  ```

**순서**: dev-2 완료 → critic-2 GO → qa spec 업그레이드 → 단일 spec 재실행 → 전체 재실행

**예상 소요**: dev-2 10분 + qa 10분 + 재실행 3분 = ~25분

**통과 기준**: ISD spec PASS, 전체 313+ passed, 0 failed, 0 flaky

---

### 2-2. A-1: AI 스텁 전용 모드 도입 (Optional → Cycle 3 자발적 추진)

**목표**: `E2E_STUB_MODE=true` 환경변수 시 AI 엔드포인트 자동 스텁 → Gemini cold start 재발 예방

**담당**:
- dev-2: Playwright fixtures에서 AI 엔드포인트 스텁 구현
  - 대상: `api/ai/{quiz,analysis,coaching,report,mentor-briefing}`
  - 프로덕션 코드 변경 없음 — 환경변수 분기만
- critic-2: "기존 프로덕션 코드에 영향 없는지" 검증

**순서**: critic-2 GO → dev-2 구현 → qa 검증 → 전체 재실행

**예상 소요**: dev-2 20-30분 + qa 10분 + 재실행 3분 = ~45분

**통과 기준**: AI 스텁 모드에서 전체 passed 수 유지, 0 failed, 0 flaky

---

### Round 3.1 실행 순서
1. B-0 (data-testid) 먼저 — 소규모, 리스크 낮음
2. B-0 통과 확인 후 A-1 진행
3. A-1 통과 확인 후 Round 3.2 진입

---

## 3. Round 3.2 — 프로세스 문서화

### 3-1. B-1: pre-automation 체크리스트

**파일**: `docs/scrum/process-qa-pre-automation.md`  
**담당**: planner (규칙 문서화) + qa (적용 확인)

```
spec 작성 전 확인 항목:
[ ] 1. 대상 엔드포인트가 src/app/api/에 실제 존재하는가?
[ ] 2. auth 상속 방식: test.use() storageState인가? → 미인증 테스트는 request.newContext() 별도 생성
[ ] 3. 응답 상태코드를 route.ts에서 직접 확인했는가?
[ ] 4. 응답 필드명(camelCase vs snake_case)을 API 코드에서 확인했는가?
```

---

### 3-2. B-3: Realtime flaky 격리 CI

**파일**: `docs/scrum/process-ci-flaky.md`  
**담당**: planner (규칙 문서화)

```bash
# 별도 구간: SSN-RT / SSP-RL / MSD-RL 계열
npx playwright test --grep "SSN-RT|SSP-RL|MSD-RL" --workers=1 --retries=2
```

---

### 3-3. B-2: Wiki → TC 연동 표준화

**규칙 문서화** (planner):
- Wiki `Gotchas` 섹션 작성 시 관련 TC ID 명시
- TC 시트 작성 시 Wiki `Gotchas`를 참조 소스로 포함
- Wiki 수정 시 연관 TC 재검토 의무화

**담당**: planner (규칙) + analyst-2 (Wiki 작성 시 적용)

---

## 4. Round 3.3 — SKIP 해제 (선택적)

analyst-2 전수 조사(round-3-skip-analysis.md) 확정 분류 기반.

### 유형 A — cascade (~186건) : Round 3.1~3.2 작업
fixture 안정화로 해제 가능. Round 3.1 B-0/A-1 작업 중 병행 해제 시도.

### 유형 B — 플레이스홀더 (~595건) : Round 3.3 작업

| 분류 | 건수 | 해제 조건 |
|------|------|---------|
| **인프라 불필요** (student-result/join, mentor-list, owner-dashboard) | **~251** | qa 테스트 코드 작성 — **Round 3.3 우선 타겟** |
| AI 스텁 의존 | ~186 | A-1 완료 후 |
| Realtime 의존 (SSN-RT + student-session 79건) | ~87 | B-3 CI 완료 후 |
| 기타 의도적 skip | ~72 | 기능 구현 후 단계적 |

**Round 3.3 착수 순서**:
1. 인프라 불필요 ~251건 — qa 테스트 코드 작성 (선행 조건 없음, 즉시 가능)
2. AI 스텁 의존 ~186건 — A-1 완료 후
3. Realtime ~87건 — B-3 CI 완료 후

**선택 기준**: 해제 후 전체 재실행에서 passed 수 순증, failed=0, flaky=0 유지.

---

## 5. all pass 유지 원칙

1. 각 Round 종료 시 전체 재실행 (`npm run test:e2e`)
2. **FAIL = 0, flaky = 0 필수** — 미달 시 Round 중단
3. 실패 발생 시:
   ```
   실패 spec 단독 재실행 → 원인 분석 → fix → 재실행 → 0 확인 → 전체 재실행
   ```
4. 회귀 발견 시: Round 즉시 중단 → analyst-2 분석 → fix → 재실행

---

## 6. 역할 배분

| 역할 | Cycle 3 담당 |
|------|-----------|
| planner | cycle-3-plan 유지, 각 Round 회고 기획, B-1/B-2/B-3 문서 작성 |
| analyst-2 | SKIP 781건 재분류, Round 분석, 해제 가능 건수 추정 |
| critic-2 | Round 비평, A-1 프로덕션 영향 검증, 최종 검증 |
| dev-2 | B-0 data-testid 추가, A-1 AI 스텁 모드 구현 |
| qa | spec 업그레이드, Round 실행, SKIP 해제 판단, 결과 보고 |

---

## 7. 대기 중인 작업

- **dev-2**: B-0 착수 대기 (이 문서 확정 후 시작)
- **analyst-2**: SKIP 781건 재분류 → 해제 가능 건수 DM
- **planner**: B-1, B-3, B-2 문서 작성 (Round 3.2 진입 시)

---

## Changelog

- 2026-04-11 초판 (planner) — Cycle 3 킥오프, Round 3.1~3.3 3-Gate 구조, all pass 원칙 명시
