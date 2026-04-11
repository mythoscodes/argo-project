---
type: screen
id: screen-student-join
related:
  - "[[api-sessions-join]]"
  - "[[screen-student-session]]"
  - "[[concept-join-code]]"
  - "[[role-student]]"
sources:
  - "src/app/student/join/page.tsx"
  - "docs/tc/student-join.md"
updated: 2026-04-11
owner: analyst-2
---

# screen-student-join — 수강생 참여코드 입력

## Summary

`/student/join` 라우트. 수강생이 6자리 영숫자 참여코드를 입력하여 활성 세션에 참여하는 진입점. `POST /api/sessions/join`으로 코드 검증 후 세션 화면으로 이동.

## Key Claims

- 참여코드 charset: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` — 혼동 문자(0,1,I,O) 제외. 정확히 6자리.
- `join_code`는 `status = "active"` 세션에만 존재 (draft = null). draft 세션 참여 시 `404` 또는 "세션을 찾을 수 없습니다".
- 클립보드 7자 이상 붙여넣기: 앞 6자만 사용 또는 입력 거부 — 정책 확인 필요.
- 이모지/특수문자 입력: 클라이언트 필터링 또는 서버 400 반환.
- 비인증 접근 → `/login` 리다이렉트 (student layout guard).

## Intuition / Why

수강생이 강사에게 참여코드를 구두/화면으로 받아 입력하는 가장 단순한 진입 플로우. 코드는 6자리 영숫자로 단순하게 유지 — KIT 성인 수강생이 빠르게 입력 가능.

## Details

혼동 문자 제외 charset 덕에 "0"을 "O"로 오독하는 오류 방지. 입력 필드는 대문자 자동 변환 또는 uppercase CSS 처리 권장.

**TC 파일**: `[[docs/tc/student-join.md]]` — 75개 TC (SJN-UI, SJN-API, SJN-RT, SJN-ERR + 경계값/인증/XSS/접근성 등)

## Connections

- [[api-sessions-join]] — upstream: 코드 검증 + 참여 처리
- [[screen-student-session]] — downstream: 참여 성공 후 이동
- [[concept-join-code]] — see-also: join_code 생성/발급 정책
- [[role-student]] — implements: student role 진입점

## Gotchas

- **E2E 정규식 버그 (Cycle 1 Issue 3)**: Playwright 스펙에서 `/\b\d{6}\b/`(숫자만)로 참여코드 검출 시도 → 실제 charset이 영숫자 혼합이라 탐지 실패. `/\b[A-Z0-9]{6}\b/`로 수정.
- **draft 세션 참여 시도**: active 세션에만 join_code 존재. draft 코드 없음 → "세션을 찾을 수 없습니다" 정상 응답.

## Changelog

- 2026-04-11 — 초판 작성 (analyst-2)
- 초기 — 수강생 참여코드 입력 기본 구현
