---
type: concept
id: concept-risk-signal
related:
  - "[[concept-session]]"
  - "[[concept-quiz]]"
  - "[[concept-understanding-score]]"
  - "[[concept-heatmap]]"
  - "[[concept-academy-isolation]]"
  - "[[feature-f8-owner-dashboard]]"
  - "[[role-mentor]]"
  - "[[role-teacher]]"
  - "[[role-owner]]"
sources:
  - "src/app/api/mentor/students/route.ts"
  - "src/lib/constants.ts#RISK_*"
  - "docs/tc/owner-dashboard.md"
updated: 2026-04-11
owner: planner
---

# Risk Signal (이탈 위험 신호)

## Summary

수강생별로 3가지 신호(정답률·응답속도·출석)를 평가해 이탈 위험도를 `HIGH`/`MEDIUM`/`LOW`로 분류하는 알고리즘. `GET /api/mentor/students`가 계산·반환하며, mentor/teacher/owner 대시보드에서 위험 수강생 우선 목록으로 표시된다.

## Key Claims

- 3가지 신호 유형: `accuracy`(최근 N세션 평균 정답률), `speed`(응답속도 증가 추세), `absence`(연속 미참여) — `src/app/api/mentor/students/route.ts` L12-16
- `riskLevel` 결정 규칙: 트리거된 신호 수 ≥ `RISK_SIGNAL_COUNT_FOR_HIGH`(2개) → `HIGH`, 1개 → `MEDIUM`, 0개 → `LOW` — `route.ts` L224-231
- `RISK_ACCURACY_THRESHOLD = 40`: 최근 3세션(`RISK_ACCURACY_SESSION_COUNT`) 평균 정답률 40% 미만 시 accuracy 신호 발동 — `src/lib/constants.ts` L19-20
- `RISK_ABSENCE_THRESHOLD = 2`: 최신 5세션 중 연속 2회 이상 미참여 시 absence 신호 발동 — `src/lib/constants.ts` L21
- `RISK_SPEED_INCREASE_RATIO = 1.3`: 최근 세션 평균 응답 시간이 이전 세션 대비 30% 이상 증가 시 speed 신호 발동 (찍기 패턴 의심) — `src/lib/constants.ts` L24
- mentor는 `academy_id` 기준 학원 전체 세션의 수강생을 분석하고, teacher/owner는 자신이 개설한 세션 수강생만 분석한다 — `route.ts` L62-69

## Intuition / Why

KIT 직업훈련 수강생 중 일부는 국비지원 수강료를 받으면서 사실상 이탈 상태(찍기, 무단 결석)로 진행된다. 강사가 30명 중 위험 수강생을 수동으로 식별하기 어렵기 때문에 3가지 정량 신호를 자동으로 집계해 "지금 누구를 챙겨야 하는가"를 알려준다.

3가지 신호의 설계 근거:
- **정답률**: 학습 자체가 안 되는 경우 — 이해도 60% 임계값(WEAK_TOPIC_THRESHOLD)보다 낮은 40%로 설정해 "명백한 이해 실패"만 감지
- **응답 속도**: 답을 모르면서 빠르게 찍는 패턴 — 응답 시간이 갑자기 30% 빨라지는 것은 찍기 의심 신호
- **출석**: 아예 참여하지 않는 경우 — 2회 연속 미참여는 이탈 초기 단계

`HIGH`(2개 이상 신호) 분류를 통해 "정말 위험한" 수강생에게 mentor의 상담 자원을 집중할 수 있다.

## Details

### 위험도 계산 알고리즘

```
GET /api/mentor/students
  → 내 세션 목록 조회 (mentor: academy_id, teacher: teacher_id)
  → session_participants → uniqueStudentIds
  → 수강생별:
      [Signal 1] accuracy: AVG(최근 3세션 정답률) < 40 → triggered
      [Signal 2] speed: 최신세션응답속도 > N-1세션응답속도 × 1.3 → triggered
      [Signal 3] absence: 최신 5세션에서 연속 미참여 ≥ 2 → triggered
      triggeredCount ≥ 2 → HIGH / === 1 → MEDIUM / 0 → LOW
  → HIGH > MEDIUM > LOW 정렬 반환
```

### 반환 응답 구조 (per student)

```json
{
  "student_id": "uuid",
  "display_name": "김민준",
  "risk_level": "HIGH",
  "risk_signals": {
    "low_accuracy": true,
    "speed_increase": false,
    "absence": true
  },
  "recent_accuracy": 35,
  "consecutive_absences": 2,
  "summary": "최근 3세션 평균 정답률 35% · 최근 2회 연속 미참여"
}
```

### 상수 요약

| 상수 | 값 | 역할 |
|------|-----|------|
| `RISK_ACCURACY_THRESHOLD` | 40 | 정답률 신호 임계값 |
| `RISK_ACCURACY_SESSION_COUNT` | 3 | 평균 계산 기준 세션 수 |
| `RISK_ABSENCE_THRESHOLD` | 2 | 연속 미참여 임계값 |
| `RISK_SIGNAL_COUNT_FOR_HIGH` | 2 | HIGH 분류 신호 수 |
| `RISK_SPEED_INCREASE_RATIO` | 1.3 | 응답 속도 증가 비율 임계값 |

## Connections

- [[concept-session]] — upstream: 위험 신호는 세션 참여 이력과 응답 데이터를 기반으로 계산
- [[concept-quiz]] — upstream: 응답의 is_correct, response_time_ms가 accuracy/speed 신호의 원천
- [[concept-understanding-score]] — see-also: WEAK_TOPIC_THRESHOLD(60)와 다른 별도 임계값 RISK_ACCURACY_THRESHOLD(40) 사용
- [[concept-heatmap]] — see-also: 히트맵은 현재 세션 이해도, 위험 신호는 복수 세션 누적 이력 기반
- [[concept-academy-isolation]] — upstream: mentor의 분석 범위가 academy_id RLS를 따름
- [[feature-f8-owner-dashboard]] — implements: F8 원장/mentor 대시보드가 위험 신호 목록을 표시
- [[role-mentor]] — upstream: mentor의 주요 업무가 위험 수강생 식별 및 상담
- [[role-teacher]] — see-also: teacher도 본인 세션 수강생의 위험 신호 조회 가능
- [[role-owner]] — see-also: owner도 학원 전체 수강생 위험 신호 접근 가능

## Gotchas

- **응답 속도 신호 방향 역전**: `speedSignal` 조건이 `nonZeroSpeeds[0] > nonZeroSpeeds[last] × 1.3`인데, `nonZeroSpeeds[0]`이 "최신 세션"이고 `nonZeroSpeeds[last]`가 "이전 세션"이다. 즉, 최신이 이전보다 빠른 경우 triggered — `route.ts` L188-189. 직관과 반대로(빠를수록 위험), 코드와 주석이 "응답 속도 30% 증가"라고 되어 있으나 실제로는 "최신이 이전의 1.3배 빠름"을 감지한다. 의도된 설계인지 확인 필요.
- **세션 0개 수강생 제외**: `sessionAccuracy`에 들어가는 데이터가 없는 수강생(응답이 한 번도 없음)은 `recentAccuracyRates = []`이 되어 `avgRecentAccuracy = 100`으로 fallback된다 — `route.ts` L162-165. 무응답 수강생이 LOW로 분류되어 위험 신호 누락 가능.
- **`HIGH`=2개 기준의 의미**: 신호 3개 중 2개 이상이 HIGH 조건이므로, 3개 모두 triggered된 경우도 `HIGH`로 동일하게 분류된다. 3개 모두 triggered인 "극도 위험" 케이스를 별도 레벨로 표시하는 UI 요구사항이 추후 생길 수 있다.

## Changelog

- 2026-04-11 — 초판 작성 (planner)
