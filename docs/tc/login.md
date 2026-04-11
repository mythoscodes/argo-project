# TC — 로그인

| 항목 | 값 |
|------|---|
| 라우트 | `/login` |
| 파일 | `src/app/login/page.tsx` |
| 역할 | 공용 |
| 관련 기능 | 인증 진입점 |
| 주요 API | Supabase `auth.signInWithPassword`, `profiles.select(role)` |
| Realtime 채널 | N/A |

## 1. UI 시나리오

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| LGN-UI-001 | 정상 로그인 (강사) | 강사 계정 존재 | 1) 이메일 입력 2) 비밀번호 입력 3) "로그인" 클릭 | 로딩 스피너 표시 → `/instructor`로 이동 | Must | ⬜ |
| LGN-UI-002 | 정상 로그인 (수강생) | 수강생 계정 존재 | 동일 | `/student/join`으로 이동 | Must | ⬜ |
| LGN-UI-003 | 정상 로그인 (원장) | 원장 계정 존재 | 동일 | `/owner`로 이동 | Must | ⬜ |
| LGN-UI-004 | **정상 로그인 (mentor)** | mentor 계정 존재 | 동일 | `/mentor`로 이동 | Must | ⬜ |
| LGN-UI-005 | 이메일 형식 검증 | — | 잘못된 이메일 입력 (`abc`) 후 제출 | 브라우저 네이티브 `type="email"` 검증 메시지 | Should | ⬜ |
| LGN-UI-006 | 필수 필드 공란 | — | 이메일·비밀번호 공란 제출 | `required` 검증, 폼 제출 차단 | Must | ⬜ |
| LGN-UI-007 | 로딩 상태 UI | — | 로그인 버튼 클릭 중 | 버튼 텍스트 "로그인 중..." + `disabled` | Should | ⬜ |
| LGN-UI-008 | 회원가입 링크 | — | "회원가입" 링크 클릭 | `/register`로 이동 | Should | ⬜ |
| LGN-UI-009 | 자동완성 동작 | 브라우저에 자격증명 저장됨 | 포커스 | `autocomplete="email"`, `autocomplete="current-password"` 동작 | Could | ⬜ |
| LGN-UI-010 | 이메일 대소문자 처리 | 계정이 `user@example.com`으로 등록 | `USER@EXAMPLE.COM` 입력 후 로그인 | Supabase가 소문자 정규화하여 성공 로그인 | Should | ⬜ |
| LGN-UI-011 | 비밀번호 앞뒤 공백 | 비밀번호에 공백 포함 여부 | 공백 포함 비밀번호 입력 | 정확한 비밀번호 전송 (trim 미적용) | Should | ⬜ |
| LGN-UI-012 | 이미 로그인된 상태에서 `/login` 접속 | 강사 세션 활성 | `/login` 직접 URL 입력 | `/instructor` 리다이렉트 (로그인 폼 미표시) | Should | ⬜ |
| LGN-UI-013 | 탭 키 네비게이션 | — | Tab 키로 이메일→비밀번호→버튼 순 이동 | 포커스 순서 논리적, 키보드만으로 로그인 가능 | Should | ⬜ |
| LGN-UI-014 | Enter 키 제출 | — | 비밀번호 필드에서 Enter | 폼 제출 동작 | Must | ⬜ |
| LGN-UI-015 | 로그인 성공 후 새로고침 | 강사로 로그인 후 새로고침 | F5 | `/instructor` 유지 (세션 지속) | Should | ⬜ |
| LGN-UI-016 | 페이지 타이틀 | — | `/login` 진입 | `<title>` 또는 헤더에 "로그인" 표시 | Could | ⬜ |
| LGN-UI-017 | 에러 후 재시도 | 잘못된 비밀번호 에러 발생 | 에러 메시지 후 올바른 비밀번호 재입력 | 에러 메시지 사라지고 정상 로그인 | Must | ⬜ |
| LGN-UI-018 | 비밀번호 최소 1자 | 1자 비밀번호 입력 | 폼 제출 | 브라우저 `minLength` 미적용이므로 서버 에러 반환 또는 Supabase 에러 | Should | ⬜ |

## 2. API 계약

| TC ID | 엔드포인트 | 요청 | 기대응답 | RLS/인가 | 우선순위 | 상태 |
|-------|-----------|------|---------|---------|---------|------|
| LGN-API-001 | `auth.signInWithPassword` | `{ email, password }` | `session` 설정, 쿠키 발급 | — | Must | ⬜ |
| LGN-API-002 | `auth.getUser()` | 로그인 직후 | 방금 로그인한 `user` 반환 | — | Must | ⬜ |
| LGN-API-003 | `profiles.select('role').eq('id', user.id).single()` | — | `{ role }` 반환 | 본인 행만 조회 (RLS) | Must | ⬜ |
| LGN-API-004 | `auth.signInWithPassword` — 쿠키 유효기간 | 로그인 성공 | Set-Cookie에 만료 시간 포함 | — | Should | ⬜ |
| LGN-API-005 | `auth.signInWithPassword` — HTTPS Only | — | `Secure; HttpOnly; SameSite=Lax` 쿠키 속성 | — | Must | ⬜ |
| LGN-API-006 | `profiles` RLS — 본인 외 조회 불가 | 로그인 후 타 유저 ID로 `profiles` 조회 | 빈 결과 | RLS | Must | ⬜ |

## 3. Realtime

N/A

## 4. 에러 / 엣지

| TC ID | 시나리오 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|---------|------|
| LGN-ERR-001 | 잘못된 비밀번호 | 한국어 에러 "이메일 또는 비밀번호가 올바르지 않습니다." 노출, 폼 유지 | Must | ⬜ |
| LGN-ERR-002 | 미등록 이메일 | 동일한 한국어 에러 (이메일 존재 여부 노출 금지 — 보안) | Must | ⬜ |
| LGN-ERR-003 | **mentor role 로그인** | `case 'mentor': router.push('/mentor')` 분기 → `/mentor`로 정상 이동, 루프 없음 (회귀 수정 완료) | Must | ⬜ |
| LGN-ERR-004 | 네트워크 실패 (오프라인) | 에러 노출, 로딩 상태 해제 | Should | ⬜ |
| LGN-ERR-005 | Supabase 레이트 리밋 | 에러 메시지 노출, 버튼 재활성화 | Could | ⬜ |
| LGN-ERR-006 | `profiles` 행 누락 (회원가입 실패 잔여) | default 분기 → `/`로 이동 후 홈 리다이렉트 로직 재적용 | Should | ⬜ |
| LGN-ERR-007 | `signInWithPassword` 성공했으나 `getUser()` null | "로그인에 실패했습니다." 한국어 에러 | Must | ⬜ |
| LGN-ERR-008 | 연속 5회 실패 — 계정 잠금 여부 | Supabase 기본 레이트 리밋 적용 시 한국어 에러 메시지 | Could | ⬜ |
| LGN-ERR-009 | XSS — 이메일 필드 `<script>alert(1)</script>` | `type="email"` 브라우저 차단 또는 Supabase API 에러, 스크립트 실행 없음 | Must | ⬜ |
| LGN-ERR-010 | SQL injection — `' OR '1'='1` | Supabase 파라미터 바인딩으로 안전 처리, 에러 반환 | Must | ⬜ |
| LGN-ERR-011 | 이메일 500자 입력 | Supabase 에러 반환, 크래시 없음 | Should | ⬜ |
| LGN-ERR-012 | 비밀번호 500자 입력 | 에러 반환, 크래시 없음 | Should | ⬜ |
| LGN-ERR-013 | 중복 제출 (더블클릭) | `isLoading` 상태로 버튼 `disabled`, 두 번 API 호출 방지 | Must | ⬜ |
| LGN-ERR-014 | Supabase 서버 500 에러 | 한국어 에러 메시지, 로딩 해제 | Should | ⬜ |
| LGN-ERR-015 | `profiles.role` = 알 수 없는 값 | default 분기 → `/` → CMN-ERR-004 처리 | Should | ⬜ |
| LGN-ERR-016 | 로그인 중 탭 닫기 | 세션 미설정 상태로 종료 — 재접속 시 `/login` | Could | ⬜ |
| LGN-ERR-017 | ARIA — 에러 메시지 접근성 | 에러 메시지에 `role="alert"` 또는 `aria-live="polite"` | Should | ⬜ |
| LGN-ERR-018 | 한국어 에러 메시지 정확성 | 잘못된 비밀번호 시 "이메일 또는 비밀번호가 올바르지 않습니다." 정확한 텍스트 매칭 | Must | ⬜ |
