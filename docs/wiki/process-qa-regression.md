---
type: process
id: process-qa-regression
related:
  - "[[process-cycle-scrum]]"
  - "[[test-e2e-strategy]]"
  - "[[test-rls-cross-check]]"
  - "[[concept-join-code]]"
  - "[[rls-profiles]]"
sources:
  - "docs/tc/README.md#알려진 회귀 리스크"
  - "docs/scrum/e2e-results.md"
updated: 2026-04-11
owner: team-lead
---

# QA 회귀 방지 프로세스

## Summary

QA 5사이클에서 발견된 회귀 4건(join_code 노출, 원장 role 체크, RISK_SPEED_INCREASE_RATIO 상수화, mentor 라우팅)을 Playwright 스펙으로 영구 고정. 신규 회귀 발견 시 즉시 회귀 테이블에 등록.

## Key Claims

- `docs/tc/README.md` §알려진 회귀 리스크 테이블에 회귀 4건이 기록되어 있다 — Cycle 1에 4건 추가됨.
- 각 회귀는 최소 1개 이상의 Playwright spec으로 커버되어야 한다 — AC-5 요구사항.
- Cycle 1에서 `tests/e2e/02-regression.spec.ts` 가 7개 테스트로 4건 회귀를 전수 커버했다.
- 회귀 테스트는 **flaky 허용 0** — 1회라도 실패 시 즉시 조사.

## Intuition / Why

**왜 회귀 테이블?** 같은 버그가 재발하면 QA 비용이 2배. 명시적 테이블로 "이 버그는 다시 들어오면 안 된다"를 선언하고, 자동 테스트로 고정해야 한다.

**왜 Playwright로?** unit test는 모듈 단위라 전체 흐름에서 회귀를 잡지 못함. 예: join_code 노출은 API 응답 JSON 필드이므로 Route Handler 단위 테스트로는 검증 가능하나, 실제 프론트 렌더링 경로까지 봐야 UI 노출 여부 확인 가능.

## Details

### 현재 회귀 테이블 (Cycle 2 시작 기준)

| # | 회귀 | 원인 커밋 | 검증 spec |
|---|------|---------|----------|
| 1 | [[concept-join-code]] 평문 노출 | `236a658` | `02-regression.spec.ts` |
| 2 | 원장 대시보드 RLS 격리 | `b081bed` | `02-regression.spec.ts` |
| 3 | [[lib-constants]] `RISK_SPEED_INCREASE_RATIO` 하드코딩 → 상수화 | `06ed4d2` | `02-regression.spec.ts` |
| 4 | mentor 라우팅 유령 상태 | Cycle 2 T4 | `01-mentor-auth.spec.ts` |

### 신규 회귀 등록 절차

1. 발견자(dev/qa/critic)가 DM으로 team-lead에 보고
2. team-lead이 `docs/tc/README.md` 회귀 테이블에 행 추가
3. qa가 `tests/e2e/regression/` 하위에 spec 추가
4. critic이 근본 원인 수정 여부 검증 (워크어라운드 거부)
5. Round 재실행으로 회귀 고정 확인

## Connections

- [[process-cycle-scrum]] — upstream: Cycle 운영이 이 회귀 프로세스를 요구
- [[test-e2e-strategy]] — uses: 회귀 테스트는 E2E 전략 프레임워크 내에서 동작
- [[test-rls-cross-check]] — uses: 원장 RLS 격리 검증은 RLS 교차 검증 서브셋
- [[concept-join-code]] / [[rls-profiles]] — sees-also: 현재 회귀 테이블 항목

## Gotchas

- **원격 DB 마이그레이션 누락**: Cycle 1 Round 1에서 migration 00006 원격 미적용으로 `profiles` RLS 무한재귀 발생 → 모든 E2E 실패. 해결: Round 시작 전 `supabase db push --dry-run` 확인을 표준 절차로.
- **회귀 테이블 정체**: 회귀가 발견되면 **즉시** 등록해야 함. "나중에 정리"하면 누락됨. 발견과 기록 간격 최소화.
- **flaky 회귀 테스트 금지**: 회귀 테스트가 flaky이면 "정말 고쳐졌는지" 확신 불가. 재실행 3회 연속 통과 확인 후 merge.

## Changelog

- 2026-04-11 — 초판. Cycle 1/2 회귀 4건 기록 (team-lead)
