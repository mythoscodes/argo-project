# TC — 홈 (역할 라우팅)

| 항목 | 값 |
|------|---|
| 라우트 | `/` |
| 파일 | `src/app/page.tsx` |
| 역할 | 공용 (미인증/인증 모두 진입) |
| 관련 기능 | 역할 기반 랜딩 |
| 주요 API | Supabase `auth.getUser()`, `profiles.select(role)` |
| Realtime 채널 | N/A |

> 서버 컴포넌트. 인증 상태와 `profiles.role`을 읽어 즉시 리다이렉트한다. 자체 UI 없음.

## 1. UI 시나리오

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| CMN-UI-001 | 미인증 진입 | 세션 쿠키 없음 | `/` 접속 | `/login`으로 302 리다이렉트 | Must | ⬜ |
| CMN-UI-002 | 강사 로그인 상태 | `profiles.role = 'teacher'` | `/` 접속 | `/instructor`로 리다이렉트 | Must | ⬜ |
| CMN-UI-003 | 수강생 로그인 상태 | `profiles.role = 'student'` | `/` 접속 | `/student/join`으로 리다이렉트 | Must | ⬜ |
| CMN-UI-004 | 원장 로그인 상태 | `profiles.role = 'owner'` | `/` 접속 | `/owner`로 리다이렉트 | Must | ⬜ |
| CMN-UI-005 | **mentor 로그인 상태** | `profiles.role = 'mentor'` | `/` 접속 | `/mentor`로 리다이렉트 | Must | ⬜ |
| CMN-UI-006 | 다중 탭 — 동일 세션 | 강사가 탭 2개에서 `/` 동시 접속 | — | 각 탭 독립적으로 `/instructor` 리다이렉트, 충돌 없음 | Should | ⬜ |
| CMN-UI-007 | 로그아웃 후 `/` 재접속 | 로그아웃으로 쿠키 만료 | 재접속 | `/login` 리다이렉트 (캐시된 role 사용 안 함) | Must | ⬜ |
| CMN-UI-008 | 뒤로가기로 `/` 접근 | 강사가 `/instructor`에서 뒤로가기 | — | 서버에서 재평가 → `/instructor` 재리다이렉트, 루프 없음 | Should | ⬜ |

## 2. API 계약

| TC ID | 엔드포인트 | 요청 | 기대응답 | RLS/인가 | 우선순위 | 상태 |
|-------|-----------|------|---------|---------|---------|------|
| CMN-API-001 | `profiles.select('role')` (자기 자신) | `.eq('id', user.id).single()` | `{ role: 'teacher'\|'student'\|'owner'\|'mentor' }` | 본인 행만 조회 (RLS) | Must | ⬜ |
| CMN-API-002 | `auth.getUser()` 응답 구조 | 세션 쿠키 유효 | `{ user: { id, email } }` — null 아님 | — | Must | ⬜ |
| CMN-API-003 | RLS — 타 유저 profiles 행 조회 시도 | `.eq('id', other_user_id)` | 빈 결과 (RLS 차단) | profiles RLS | Must | ⬜ |

## 3. Realtime

N/A — 이 화면은 즉시 리다이렉트되므로 구독 대상 없음.

## 4. 에러 / 엣지

| TC ID | 시나리오 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|---------|------|
| CMN-ERR-001 | `profiles` 행 누락 (회원가입 중단 상태) | default로 `/login` 리다이렉트, 루프 없음 | Must | ⬜ |
| CMN-ERR-002 | **mentor role 사용자 진입** | `role === 'mentor'` 분기 → `/mentor` 리다이렉트 (회귀 수정 완료) | Must | ⬜ |
| CMN-ERR-003 | 세션 만료 (쿠키 있지만 `getUser()` null) | `/login` 리다이렉트 | Must | ⬜ |
| CMN-ERR-004 | `profiles.role` NULL 또는 알 수 없는 값 | default로 `/login` 리다이렉트 | Should | ⬜ |
| CMN-ERR-005 | `profiles.select()` DB 에러 (500) | 에러 전파 없이 `/login` fallback 리다이렉트 | Should | ⬜ |
| CMN-ERR-006 | `getUser()` 성공하나 `user.id` 없음 | `/login` 리다이렉트, 크래시 없음 | Should | ⬜ |
| CMN-ERR-007 | role = `'admin'` (미정의 값) | default 분기 → `/login` 리다이렉트 | Should | ⬜ |
| CMN-ERR-008 | Supabase 연결 타임아웃 | `/login` fallback 리다이렉트, 무한 대기 없음 | Should | ⬜ |
| CMN-ERR-009 | XSS — URL 파라미터 `/?role=<script>` | 서버 컴포넌트에서 파라미터 무시, 역할 판단은 DB 기반 | Must | ⬜ |
| CMN-ERR-010 | 쿠키 조작 — 유효하지 않은 JWT | `getUser()` null 반환 → `/login` 리다이렉트 | Must | ⬜ |
| CMN-ERR-011 | 동시 역할 변경 (관리자가 role 업데이트 중) | 다음 `/` 접속 시 새 role로 분기 (캐시 무효화) | Could | ⬜ |
| CMN-ERR-012 | 새로고침 반복 (F5 × 5) | 매번 서버 재평가, role 캐싱으로 인한 잘못된 리다이렉트 없음 | Could | ⬜ |
| CMN-ERR-013 | 접근성 — 스크린리더 | 리다이렉트 중 화면에 텍스트 없음 — SR 사용자에게 빈 화면이 아닌 의미 있는 상태 전달 | Could | ⬜ |
| CMN-ERR-014 | Supabase RLS 재귀 방지 회귀 | `profiles` 조회 시 `ERR_TOO_MANY_REDIRECTS` 또는 무한루프 없음 (migration 00006 회귀) | Must | ⬜ |
| CMN-ERR-015 | 네트워크 오프라인 | `/login` fallback — 무한 로딩 아님 | Should | ⬜ |
| CMN-ERR-016 | `profiles.role` 대소문자 불일치 (`Teacher`) | 서버에서 정규화 or DB CHECK 제약으로 불가 — 에러 시 `/login` fallback | Could | ⬜ |
