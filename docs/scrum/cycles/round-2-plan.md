# Round 2 기획 — 2026-04-11

작성자: planner  
참조: `docs/scrum/cycles/round-1-analysis.md` (analyst-2), `docs/scrum/cycles/round-1-failures.md` (qa)  
갱신: dev-2 P0+P1 완료 반영 (2026-04-11)

---

## 1. 현재 상태 (Round 2 실행 직전)

| 항목 | 상태 |
|------|------|
| P0 Supabase 계정 복구 | ✅ dev-2 완료 |
| P0 global-setup.ts 재실행 | ✅ .auth/*.json 재생성 완료 |
| P1 /api/participants 구현 | ✅ dev-2 완료 |
| P2 Cat-D spec camelCase 수정 | qa 확인 필요 |
| P3 Cat-C request.newContext() 수정 | qa 확인 필요 |
| P4 Cat-F 상태코드 범위 수정 | qa 확인 필요 |
| P5 Cat-E role redirect | ✅ 구현 이미 완료 — Cat-B 해소 시 자동 통과 예상 |

**Round 2 실행 조건**: P0+P1 완료 ✅ → **즉시 실행 가능**. P2~P4 spec 수정 완료분이 추가될수록 해소 건수 증가.

---

## 2. Round 1 실패 카테고리 요약

| 카테고리 | 건수 | Round 2 상태 |
|---------|------|------------|
| Cat-A /api/participants 없음 | 27 | ✅ P1 완료 → 해소 예상 |
| Cat-B auth 만료 연쇄 | 22 | ✅ P0 완료 → 해소 예상 |
| Cat-C request fixture 설계 오류 | 8 | qa spec 수정 완료 시 해소 |
| Cat-D camelCase 불일치 | 6 | qa spec 수정 완료 시 해소 |
| Cat-E role redirect 미구현 | 10 | Cat-B 연쇄로 자동 해결 예상 (구현 이미 완료) |
| Cat-F 상태코드 범위 누락 | 8 | qa spec 수정 완료 시 해소 |
| Cat-G 복합/미분류 | ~39 | P0 후 재분류 — 부분 해소 예상 |
| **합계** | **120** | |

---

## 3. Round 2 예상 결과

Round 1 기준: PASS 298 / FAIL 120 / SKIP 725

| 시나리오 | 전제 | 예상 PASS | 예상 FAIL |
|---------|------|---------|---------|
| P0+P1만 완료 | dev-2 완료 확인 | ~370 | ~53 |
| +P2~P4 spec 수정 | qa 완료 시 | ~390-400 | ~31 |
| +P5 Cat-E 해소 | critic-2 옵션 A 승인 시 | ~400-410 | ~21 |

**SKIP 725**: P0 환경 cascade (~300건) + P1 의존성 cascade (~150건)이 해소되면 감소 예상. 의도적 `test.skip()` (~200건)은 Round 2에서도 유지.

---

## 4. Round 2 실행 계획

### 4-1. 메인 실행
```bash
npx playwright test --workers=4
```
예상 소요: ~5분.

### 4-2. flaky 격리 실행 (Realtime + 더블클릭 방지)
```bash
npx playwright test \
  --grep "SSN-RT|SSP-RL|MSD-RL" \
  --workers=1 \
  --retries=2
```
Round 1에서 auth 만료로 실행 안 됐으므로 flaky 여부 최초 확인.

### 4-3. SKIP 재분류 (--list)
```bash
npx playwright test --list 2>&1 | grep -i skip > skip-list.txt
```
725 SKIP → [환경 cascade] / [의도적] / [의존성 cascade] / [기타] 4분류.  
Round 2 **실질 PASS율** = `PASS / (PASS + FAIL)`, 의도적 SKIP 제외.

---

## 5. Cat-E (role redirect) — critic-2 확인 완료

**결론: 추가 구현 불필요.** critic-2가 4개 layout 파일 전체를 검토한 결과, role guard + ROLE_HOME redirect가 이미 구현되어 있음이 확인됨.

Round 1 Cat-E 10건 실패는 "역방향 redirect 미구현"이 아닌 **Cat-B auth 만료 연쇄**에 의한 가짜 실패였다. P0(Supabase 계정 복구 + global-setup 재실행) 완료로 auth 상태가 정상화되면 Cat-E 10건은 Round 2에서 자동 통과 예상.

> "가장 좋은 workaround는 필요 없는 workaround" — team-lead

---

## 6. Round 2 결과 시나리오별 후속 계획

### 시나리오 A — Round 2 통과 (FAIL 0)
1. T12 즉시 `completed`
2. critic-2 T8 최종 검증 리뷰 시작
3. planner T9 스프린트 최종 보고서 작성
4. **725 SKIP은 Cycle 3 과제로 이월**

### 시나리오 B — 소수 실패 (Cat-E 10건만 남음)
- critic-2 옵션 A 승인 시 → dev-2 layout 4개 일괄 수정 → Round 3
- critic-2 옵션 B 선택 시 → qa skip 처리 → Round 3 즉시 실행 → FAIL 0 확인 → T12 완료

### 시나리오 C — 예상 외 실패 (Cat-G 기타 대량)
- RLS 교차 FAIL이 남아 있으면: **P0 분류 블로커** — 즉시 dev-2 투입, critic-2 GO
- 기타 신규 원인: analyst-2 Round 2 분석 → 새 원인 식별 → Round 3 기획

---

## 7. Round 2 통과 기준

| 지표 | 목표 |
|------|------|
| FAIL | ≤ 30건 |
| 실질 PASS율 (의도적 SKIP 제외) | ≥ 85% |
| **RLS 교차 FAIL** | **0건 필수** |
| `session_participants` INSERT — 타 학원 academy_id 교차 방어 | **0 FAIL 필수** |
| SSN-RT flaky (CHANNEL_ERROR/TIMED_OUT) | 격리 재실행 후 확인 |

미달 시 Round 3 진행. FAIL = 0이면 T12 즉시 종료.

---

## 8. 병렬 작업 (Round 2 실행 대기 중)

- **qa + analyst-2**: 725 SKIP --list 분류 작업
- **planner**: Wiki optional concept 3개 (`coaching`, `delta`, `round`) — Round 2 결과 대기 중 작성 가능. team-lead 지시 없으면 대기.

---

## 9. 역할 배분

| 역할 | 작업 | 상태 |
|------|------|------|
| dev-2 | P0+P1 완료 | ✅ |
| qa | P2~P4 spec 수정 + Round 2 실행 | 진행 중 |
| critic-2 | round-1-critique.md + Cat-E 판단 | 진행 중 |
| analyst-2 | Round 2 결과 분석 | Round 2 후 |
| planner | Round 3 기획 or T9 전환 | Round 2 결과 DM 후 |

---

## Changelog

- 2026-04-11 초판 — round-1-analysis.md 기반 3-Gate 구조
- 2026-04-11 갱신 — dev-2 P0+P1 완료 반영, 시나리오 A/B/C 추가
- 2026-04-11 갱신 — Cat-E "critic-2 판단 대기" → "구현 이미 완료, Cat-B 연쇄로 자동 해결 예상"으로 수정 (critic-2 layout 코드 검증 기반)
