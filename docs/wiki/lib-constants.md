---
type: lib
id: lib-constants
related:
  - "[[feature-f2-quiz-generation]]"
  - "[[feature-f5-ai-coaching]]"
  - "[[api-mentor-students]]"
  - "[[concept-risk-signal]]"
sources:
  - "src/lib/constants.ts"
  - "CLAUDE.md#코드-품질"
  - "docs/scrum/dev-changelog.md#T4"
updated: 2026-04-11
owner: analyst-2
---

# lib-constants — 전역 매직 넘버 상수 정의

## Summary

Argos 전체에서 공유하는 수치 상수 모음. CLAUDE.md 규칙 #20 "매직 넘버 금지 → constants.ts에 상수로 정의"의 직접 구현체. AI 온도, 퀴즈 설정, 멘토 위험 감지 임계값을 포함한다.

## Key Claims

- `RISK_SPEED_INCREASE_RATIO = 1.3` — 수강생 평균 응답 속도 대비 1.3배 이상 증가 시 `speed_increase` 신호 발동. (커밋 `06ed4d2`에서 매직 넘버 `1.3` → 상수화)
- `RISK_SIGNAL_COUNT_FOR_HIGH = 2` — 3-signal 중 2개 이상 발동 시 위험도 HIGH. 1개면 MEDIUM, 0개면 LOW.
- `RISK_ACCURACY_THRESHOLD = 40` — 최근 3세션 정답률 40% 미만 시 `low_accuracy` 신호.
- `RISK_ABSENCE_THRESHOLD = 2` — 연속 미참여 2회 이상 시 `absence` 신호.
- `WEAK_TOPIC_THRESHOLD = 60` — 토픽 정답률 60% 이하면 약점 토픽으로 분류 (`student_reports` 등).
- `SESSION_CODE_LENGTH = 6` — 참여코드는 항상 6자리 영숫자.
- AI 온도: 퀴즈 `0.3`, 코칭/리포트/멘토브리핑 `0.5` — CLAUDE.md 규칙 #15.

## Intuition / Why

CLAUDE.md 규칙 #20은 매직 넘버를 constants.ts에 두도록 강제한다. 이 파일이 없으면 `1.3`, `40`, `60` 같은 임계값이 API Route마다 흩어져 정책 변경 시 다중 파일 수정이 필요하다. 단일 변경점(SSoT)이 핵심 이유.

T4에서 `RISK_SPEED_INCREASE_RATIO`를 커밋 `06ed4d2`에서 상수화한 것이 대표 사례 — 기존에 `"30%"` 문자열을 비교하던 코드를 동적 파생 문자열로 교체.

## Details

주요 상수 그룹:

| 그룹 | 상수 | 값 |
|------|------|----|
| AI 온도 | `AI_TEMPERATURE_QUIZ` | 0.3 |
| AI 온도 | `AI_TEMPERATURE_COACHING` / `_REPORT` / `_MENTOR_BRIEFING` | 0.5 |
| 퀴즈 | `MAX_QUIZ_COUNT` / `MIN_QUIZ_COUNT` / `DEFAULT_QUIZ_COUNT` | 5 / 1 / 3 |
| 세션 | `SESSION_CODE_LENGTH` | 6 |
| 멘토 위험 | `RISK_ACCURACY_THRESHOLD` | 40 |
| 멘토 위험 | `RISK_ABSENCE_THRESHOLD` | 2 |
| 멘토 위험 | `RISK_SIGNAL_COUNT_FOR_HIGH` | 2 |
| 멘토 위험 | `RISK_SPEED_INCREASE_RATIO` | 1.3 |
| 리포트 | `WEAK_TOPIC_THRESHOLD` | 60 |
| 대시보드 | `RESPONSE_RATE_THRESHOLD` | 50 |

## Connections

- [[feature-f2-quiz-generation]] — upstream: `MAX_QUIZ_COUNT`, `AI_TEMPERATURE_QUIZ` 사용
- [[feature-f5-ai-coaching]] — upstream: 3-signal 임계값 4개 (`RISK_*`) 사용
- [[api-mentor-students]] — downstream: `RISK_*` 상수로 위험도 계산
- [[concept-risk-signal]] — see-also: 3-signal 모델의 임계값이 여기에 수치로 정의

## Gotchas

- **`AI_MAX_RETRY_COUNT = 1`**: AI JSON 파싱 실패 시 재시도 횟수. 이 값이 1이므로 실패 → 1회 재시도 → 실패 시 `500`. CLAUDE.md 규칙 #14와 연동.
- **`WEAK_TOPIC_THRESHOLD = 60` vs `RISK_ACCURACY_THRESHOLD = 40`**: 두 임계값은 다른 문맥. 60은 `student_reports`에서 개인 취약 토픽 판별, 40은 멘토 위험 감지 `low_accuracy` 신호. 혼동 주의.
- **`RISK_SPEED_INCREASE_RATIO` 활용 방식**: 비율 상수이므로 `avgResponseTime * RISK_SPEED_INCREASE_RATIO`로 임계값을 동적 계산. 숫자 그대로 퍼센트 표시에 사용 시 `((RISK_SPEED_INCREASE_RATIO - 1) * 100).toFixed(0) + "%"` 변환 필요.

## Changelog

- 2026-04-11 — `RISK_SPEED_INCREASE_RATIO` 상수화 (커밋 `06ed4d2`). `AI_TEMPERATURE_MENTOR_BRIEFING`, `RISK_*` 멘토 상수 추가 (T4)
- 초기 — AI 온도, 퀴즈 기본값, `SESSION_CODE_LENGTH` 정의
