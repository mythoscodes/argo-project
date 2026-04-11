---
type: screen
id: screen-mentor-list
related:
  - "[[api-mentor-students]]"
  - "[[screen-mentor-student-detail]]"
  - "[[role-mentor]]"
  - "[[concept-risk-signal]]"
  - "[[lib-constants]]"
sources:
  - "src/app/mentor/page.tsx"
  - "docs/tc/mentor-list.md"
  - "CLAUDE.md#MVP-우선순위"
updated: 2026-04-11
owner: analyst-2
---

# screen-mentor-list — 멘토 대시보드 (이탈 위험 리스트)

## Summary

`/mentor` 라우트. 수강생을 HIGH/MEDIUM/LOW 위험도로 분류한 카드 리스트. HIGH 건수 ≥ 1이면 빨간 알림 배너. 탭(전체/위험/주의/양호)으로 필터링.

## Key Claims

- HIGH 배너: `riskLevel === "HIGH"` 수강생이 1명 이상이면 "오늘 상담이 필요한 수강생이 N명 있습니다" 빨간 배너 표시.
- 정렬 순서: HIGH → MEDIUM → LOW (서버 응답 또는 클라이언트 정렬).
- 아바타 이니셜: `displayName.charAt(0)` — 빈 문자열이면 빈 원 (크래시 없음).
- `RISK_CONFIG[level]`이 undefined이면 크래시 가능성 — 알 수 없는 risk_level 가드 필요.
- `GET /api/mentor/students` 실패 시 `students = []` (silent failure) — 에러 토스트 미구현.

## Intuition / Why

F5 AI 코칭의 조기 개입 기능. 멘토가 매일 대시보드를 열어 HIGH 위험 수강생을 즉시 식별하고 상담할 수 있도록 한다. 탭 필터로 위험도별 집중 관리 가능.

## Details

3-signal 인디케이터: 각 카드에 `low_accuracy`, `speed_increase`, `absence` 신호가 발동 시 빨간 폰트 표시. 발동 안 된 신호는 초록 폰트.

**TC 파일**: `[[docs/tc/mentor-list.md]]` — 77개 TC (MLS-UI-001~014, MLS-API-001~006, MLS-ERR-001~006, MLS-BND-001~012, MLS-AUTH-001~008, MLS-NET-001~004, MLS-A11Y-001~006, MLS-KO-001~004, MLS-RLS-001~005, MLS-SEC-001~004, MLS-RL-001~003, MLS-NAV-001~005)

## Connections

- [[api-mentor-students]] — upstream: 이 화면이 소비하는 유일한 API
- [[screen-mentor-student-detail]] — downstream: 카드 클릭 시 이 화면으로 이동
- [[role-mentor]] — implements: mentor role의 주 화면
- [[concept-risk-signal]] — uses: 3-signal HIGH/MEDIUM/LOW 개념을 시각화
- [[lib-constants]] — upstream: `RISK_SIGNAL_COUNT_FOR_HIGH`, `RISK_*` 임계값

## Gotchas

- **타 학원 수강생 노출 방지**: API가 RLS로 격리하지만, URL 직접 접근 시 mentor layout guard가 role 체크. layout guard 없으면 타 role이 대시보드 접근 가능.
- **silent failure**: `GET /api/mentor/students` 500 시 에러 표시 없이 빈 리스트. 사용자는 "수강생이 없다"고 오해할 수 있음.

## Changelog

- 2026-04-11 — T4: mentor layout guard 추가, mentor API 접근 허용
- 초기 — 멘토 대시보드 기본 구현
