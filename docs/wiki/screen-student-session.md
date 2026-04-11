---
type: screen
id: screen-student-session
related:
  - "[[hook-use-realtime]]"
  - "[[api-sessions-id]]"
  - "[[screen-student-join]]"
  - "[[screen-student-result]]"
  - "[[feature-f3-response-collection]]"
sources:
  - "src/app/student/sessions/[id]/page.tsx"
  - "docs/tc/student-session.md"
updated: 2026-04-11
owner: analyst-2
---

# screen-student-session — 수강생 세션 참여 화면

## Summary

`/student/sessions/[id]` 라우트. 수강생이 강사의 퀴즈를 실시간으로 수신하고 응답을 제출하는 메인 화면. Supabase Realtime으로 새 퀴즈를 push 수신하며, `POST /api/responses`로 응답을 제출한다.

## Key Claims

- 퀴즈 수신: `useRealtimeResponses` 또는 유사 Realtime 훅으로 `quizzes` 테이블 INSERT 이벤트 구독.
- 응답 제출: `POST /api/responses` — student_id, quiz_id, session_id, selected_answer, response_time_ms.
- `response_time_ms` 측정: 퀴즈 수신 시각 기준으로 제출 시각까지의 밀리초. 서버가 `response_time_ms`로 `speed_increase` 신호 계산.
- 더블 제출 방지: 동일 quiz_id에 대한 두 번째 제출 차단 필요 (RLS `responses_insert_student` + 클라이언트 가드).
- 세션 `status !== "active"` 시 "세션이 활성화되지 않았습니다" 상태 표시.

## Intuition / Why

F3(수강생 응답 수집)의 핵심 화면. 강사가 퀴즈를 생성하면 수강생 화면에 실시간으로 나타나야 한다. polling 방식은 지연이 크므로 Supabase Realtime push 방식 사용.

## Details

CHANNEL_ERROR/TIMED_OUT 발생 시 `isConnected = false`, `error` 상태 표시. 자동 재연결 미구현 — 수강생이 새로고침 필요.

**TC 파일**: `[[docs/tc/student-session.md]]` — 99개 TC (SSN-UI, SSN-API, SSN-RT, SSN-ERR, SSN-BND, SSN-AUTH, SSN-NET, SSN-A11Y, SSN-KO, SSN-RLS, SSN-SEC, SSN-RL, SSN-NAV)

## Connections

- [[hook-use-realtime]] — uses: Realtime 구독 훅으로 퀴즈 수신
- [[api-sessions-id]] — upstream: 세션 상태/정보 조회
- [[screen-student-join]] — upstream: 참여코드 입력 후 이 화면으로 진입
- [[screen-student-result]] — downstream: 세션 종료 후 결과 화면으로 이동
- [[feature-f3-response-collection]] — implements: F3의 수강생 측 UI

## Gotchas

- **`response_time_ms` 정확도**: 클라이언트 시간 기준 측정 — 시스템 시계가 잘못 설정된 경우 부정확. 서버 타임스탬프와의 차이로 보정 검토 가능.
- **Realtime 재연결**: CHANNEL_ERROR 발생 시 현재 재연결 미구현 — 수업 중 연결 끊김 시 수강생이 직접 새로고침해야 함.

## Changelog

- 2026-04-11 — T4: Realtime CHANNEL_ERROR/TIMED_OUT 핸들링 추가 (hook-use-realtime 수정)
- 초기 — 수강생 세션 기본 구현
