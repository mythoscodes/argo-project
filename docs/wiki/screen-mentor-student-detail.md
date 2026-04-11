---
type: screen
id: screen-mentor-student-detail
related:
  - "[[api-mentor-students-id]]"
  - "[[api-mentor-consultations]]"
  - "[[api-ai-mentor-briefing]]"
  - "[[screen-mentor-list]]"
  - "[[lib-constants]]"
  - "[[concept-risk-signal]]"
sources:
  - "src/app/mentor/students/[id]/page.tsx"
  - "docs/tc/mentor-student-detail.md"
updated: 2026-04-11
owner: analyst-2
---

# screen-mentor-student-detail — 멘토 수강생 상담 상세

## Summary

`/mentor/students/[id]` 라우트 (482줄). 위험도 헤더 + 3-신호 그리드 + AI 상담 브리핑(온디맨드) + 세션 정답률 추이 LineChart + 취약 토픽 RadarChart + 상담 기록 CRUD 다이얼로그를 하나의 화면에 통합.

## Key Claims

- AI 브리핑은 버튼 클릭 시 `POST /api/ai/mentor-briefing` 온디맨드 호출 — 초기 진입 시 미노출.
- 상담 기록 저장: `POST /api/mentor/consultations` 실패 시 다이얼로그 유지, 에러 표시 현재 미구현 (silent failure).
- `talking_points = []`이면 빈 `<ol>` 렌더 — 크래시 없음.
- RadarChart 토픽 1~2개: 최소 3각이어야 레이더 의미 있음 — fallback UI 확인 필요.
- 상담 기록 `content` 공란 시 저장 버튼 `disabled` — 클라이언트 검증.
- 타 학원 수강생 URL 직접 접근 → RLS로 `404` 또는 빈 상태 (MSD-ERR-001, 커밋 `b081bed` 회귀 방지).

## Intuition / Why

멘토가 개별 수강생 상담 전에 AI 브리핑으로 맥락을 파악하고, 상담 후 기록을 남기는 단일 워크플로 화면. 강사 화면(히트맵 중심)과 달리 멘토 화면은 1:1 케어 관점.

## Details

취약 토픽 색상 분기: `accuracy < 40` → 빨강, `40 ≤ accuracy < 60` → 노랑, `≥ 60` → 초록. `WEAK_TOPIC_THRESHOLD = 60` 상수와 연동.

**TC 파일**: `[[docs/tc/mentor-student-detail.md]]` — 126개 TC (MSD-UI-001~038, MSD-API-001~009, MSD-ERR-001~010, MSD-BND-001~023, MSD-AUTH-001~009, MSD-NET-001~007, MSD-AI-001~006, MSD-A11Y-001~012, MSD-KO-001~006, MSD-RLS-001~008, MSD-SEC-001~007, MSD-RL-001~004, MSD-NAV-001~008)

## Connections

- [[api-mentor-students-id]] — upstream: 수강생 상세 데이터 (`risk + history + weak_topics`)
- [[api-mentor-consultations]] — upstream: 상담 기록 GET/POST
- [[api-ai-mentor-briefing]] — upstream: AI 브리핑 POST
- [[screen-mentor-list]] — upstream: 이 화면 진입 이전 화면
- [[lib-constants]] — upstream: `WEAK_TOPIC_THRESHOLD = 60`, `RISK_*` 임계값

## Gotchas

- **XSS on content**: `consultation_notes.content`에 `<script>` 삽입 시 React escape로 안전하나, DB에 원본 저장 — API 레벨에서 sanitize 미구현. MSD-SEC-001.
- **브리핑 더블클릭**: 버튼 `disabled` 처리 없으면 AI API 중복 호출 가능. MSD-RL-001.
- **RLS 교차**: `mentor-student-detail` MSD-RLS-001~008 — 타 학원 수강생 접근 차단이 핵심. `b081bed` 커밋 이후 회귀 여부 주기 확인.

## Changelog

- 2026-04-11 — T4: mentor role 추가, API 접근 허용, mentor layout guard
- 초기 — 멘토 수강생 상세 기본 구현
