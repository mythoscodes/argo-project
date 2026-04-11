---
type: api
id: api-mentor-students
related:
  - "[[api-mentor-students-id]]"
  - "[[lib-constants]]"
  - "[[rls-profiles]]"
  - "[[rls-sessions]]"
  - "[[screen-mentor-list]]"
  - "[[concept-risk-signal]]"
sources:
  - "src/app/api/mentor/students/route.ts"
  - "docs/tc/mentor-list.md"
  - "docs/scrum/dev-changelog.md#T4"
updated: 2026-04-11
owner: analyst-2
---

# api-mentor-students — GET /api/mentor/students

## Summary

멘토 대시보드에 표시할 수강생별 이탈 위험도 목록을 반환한다. `lib-constants`의 3-signal 임계값으로 HIGH/MEDIUM/LOW를 계산하며, mentor role은 학원 전체 세션 기반, teacher/owner는 본인 세션 기반으로 분기한다.

## Key Claims

- 인가: `role IN ('owner', 'teacher', 'mentor')` — student는 `403`. (T4 이전엔 mentor 제외였음)
- mentor는 `academy_id = profile.academy_id` 기반 전체 세션 조회 (N-8). teacher/owner는 `teacher_id = user.id` 본인 세션만.
- 위험도 계산: `RISK_SIGNAL_COUNT_FOR_HIGH = 2` — 3-signal 중 2개 이상 발동 시 HIGH.
- 3-signal: `low_accuracy` (`< RISK_ACCURACY_THRESHOLD=40`), `speed_increase` (`> avg * RISK_SPEED_INCREASE_RATIO=1.3`), `absence` (`>= RISK_ABSENCE_THRESHOLD=2`).
- 응답 형태: `snake_case flat array` (`StudentRisk[]`) — 프론트 `mentor/page.tsx`가 직접 사용.

## Intuition / Why

멘토는 자신이 담당하는 강사의 학원(같은 학원)의 수강생 전체를 케어해야 한다. 반면 강사는 자신이 진행한 세션의 수강생만 파악하면 된다. 이 역할 차이를 쿼리 분기로 구현 (N-8).

`RISK_SPEED_INCREASE_RATIO` 1.3은 원래 매직 넘버 `"30%"` 문자열이었다가 커밋 `06ed4d2`에서 상수화. 이후 비율 파생 문자열 `((RISK_SPEED_INCREASE_RATIO - 1) * 100).toFixed(0) + "%"` 로 AI 프롬프트에도 동적 삽입.

## Details

3-signal 계산 로직 요약:
1. `recentAccuracy` = 최근 `RISK_ACCURACY_SESSION_COUNT=3` 세션 평균 정답률
2. `speedIncrease` = 현재 평균 응답 시간 / 기준 평균 ≥ `RISK_SPEED_INCREASE_RATIO`
3. `absence` = 연속 미참여 세션 수 ≥ `RISK_ABSENCE_THRESHOLD=2`
4. 발동 신호 수 ≥ `RISK_SIGNAL_COUNT_FOR_HIGH` → HIGH; = 1 → MEDIUM; 0 → LOW

## Connections

- [[api-mentor-students-id]] — sibling: 단일 수강생 상세 (`/api/mentor/students/[id]`)
- [[lib-constants]] — upstream: `RISK_*` 임계값 4개 상수 사용
- [[rls-profiles]] — upstream: `get_my_academy_id()` / `get_my_role()` 사용
- [[rls-sessions]] — upstream: mentor는 `academy_id` 기반 sessions SELECT
- [[screen-mentor-list]] — downstream: 이 API 응답을 렌더링하는 화면

## Gotchas

- **T4 이전 mentor 403**: 원래 `!["owner", "teacher"].includes(profile.role)` — mentor가 포함되지 않아 403. T4에서 mentor 추가.
- **mentor/teacher 분기 필수**: mentor를 teacher처럼 `teacher_id = user.id`로 쿼리하면 mentor 세션이 없어 빈 배열 반환. N-8 수정 전 bug.
- **응답 형태 snake_case**: 프론트 `StudentRisk` 타입이 snake_case를 기대. camelCase로 반환하면 프론트 undefined.

## Changelog

- 2026-04-11 — T4: mentor role 허용 추가, academy_id 기반 분기 (N-8), 응답 snake_case 변환 (N-8)
- 초기 — teacher/owner 전용 위험도 계산 API
