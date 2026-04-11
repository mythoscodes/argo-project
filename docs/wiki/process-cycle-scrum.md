---
type: process
id: process-cycle-scrum
related:
  - "[[process-qa-regression]]"
  - "[[test-e2e-strategy]]"
sources:
  - "docs/scrum/acceptance-criteria.md"
  - "docs/scrum/cycles/cycle-1-analysis.md"
  - "docs/scrum/cycles/cycle-1-critique.md"
  - "docs/scrum/cycles/cycle-2-plan.md"
updated: 2026-04-11
owner: team-lead
---

# Cycle 기반 스크럼 프로세스

## Summary

Argos는 5역할 팀(planner/analyst/critic/dev/qa)으로 **Cycle → Round** 2단계 스크럼을 운영. 각 Cycle은 명확한 AC 목표, Round는 실패→fix→재실행 루프.

## Key Claims

- 한 Cycle은 `docs/scrum/acceptance-criteria.md` 의 AC-N 목록으로 시작 — planner 작성.
- 각 Cycle 종료 시 analyst가 `cycle-N-analysis.md`, critic이 `cycle-N-critique.md`, planner가 `cycle-{N+1}-plan.md` 를 **병렬**로 작성.
- Cycle 2의 T12 "반복 루프"는 Round별로 analyst→critic→planner→dev+qa 회고 체인을 강제한다 (사용자 지시).
- 팀원 이름 규약: `team-lead`, `planner`, `analyst-2`, `critic-2`, `dev-2`, `qa` (sonnet 재스폰 후 `-2` suffix).

## Intuition / Why

**왜 Cycle + Round 2단계?** Cycle은 목표 단위(AC 세트), Round는 실행 단위(테스트 한 번). Cycle 1은 "mentor 라우팅 fix + 기본 E2E 26개", Cycle 2는 "TC 3배 확장 + 100% 자동화 + all-pass 루프". Round는 Cycle 2 T12 내부에서 반복.

**왜 5역할 분리?** 단일 에이전트가 모든 걸 하면 품질 감사가 누락됨. 특히 critic이 dev의 워크어라운드를 차단하는 역할이 핵심. Cycle 1에서 critic-2가 발견한 N-1~N-9 (analyst 놓친 `/api/ai/*` mentor 403 3건 포함)가 없었다면 스프린트가 무의미했을 것.

**왜 SendMessage로만 소통?** Plain text 출력은 팀에게 전달되지 않음 — Agent tool의 샌드박스 때문. 모든 inter-agent 소통은 명시적 DM이어야 추적 가능.

## Details

### 역할 책임

| 역할 | 책임 | Cycle 시점 |
|------|------|----------|
| planner | AC 정의, Cycle 기획, 최종 보고 | 시작 + 종료 |
| analyst(-2) | 코드/결과 분석, 회귀 리스크 전수조사 | 중간 + 종료 |
| critic(-2) | 비평, GO/NO-GO, 워크어라운드 차단 | 중간 + 종료 |
| dev(-2) | 구현, 인프라, 코드 fix | 중간 |
| qa | 테스트 작성, 실행, 결과 보고 | 중간 + Round별 |

### Cycle 흐름

1. planner → AC 작성 → 팀 킥오프
2. analyst → 현상 분석 → report 작성
3. critic → 분석 비평 → dev GO/NO-GO
4. dev → fix 구현
5. qa → 테스트 작성 + 실행
6. (T12) Round 루프: 실패분 fix → 재실행 → 0 failure 달성까지
7. Cycle 종료 시 analyst(분석) + critic(비평) + planner(다음 기획) 병렬 회고

## Connections

- [[process-qa-regression]] — sibling: Cycle 내 QA 회귀 방지 서브프로세스
- [[test-e2e-strategy]] — uses: Cycle의 qa 실행 단계가 이 전략을 따름

## Gotchas

- **old/new 에이전트 타이밍 엇갈림**: sonnet 재스폰 시 기존 opus 에이전트가 shutdown 처리 중 동일 이름 spawn 불가 → `-2` suffix. Cycle 2 초기에 이 때문에 Task claim 충돌 발생. 해결: 신규 에이전트에게 명시적으로 "이름 매핑" DM 전달.
- **중복 상태 알림 루프**: idle notification + task status 메시지가 교차하면 팀원들이 서로에게 같은 상태를 반복 DM. 해결: team-lead가 중재 DM으로 "추가 상태 메시지 자제" 지시.
- **Task ownership**: 공유 task(T10 등)는 하나의 owner만 가능. 분할 불가 시 "파트별 진행 보고"로 운영.

## Changelog

- 2026-04-11 — 초판. Cycle 1/2 운영 경험 정리 (team-lead)
