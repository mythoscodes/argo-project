# TC — 강사 세션 생성

| 항목 | 값 |
|------|---|
| 라우트 | `/instructor/sessions/new` |
| 파일 | `src/app/instructor/sessions/new/page.tsx` |
| 역할 | 강사 |
| 관련 기능 | F1 세션 관리 — 생성 |
| 주요 API | `POST /api/sessions` |
| Realtime 채널 | N/A |

## 1. UI 시나리오

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| ISN-UI-001 | 최소 필수 입력으로 생성 | 강사 로그인 | 1) 수업 제목 2) 과목 입력 3) "세션 생성" | `/instructor/sessions/{id}` 상세로 이동 | Must | ⬜ |
| ISN-UI-002 | 모든 필드 입력 | — | 1) 제목 2) 과목 3) 카테고리 4) 주제 태그 3개 (`JPA`, `N+1`, `영속성`) 5) 익명 모드 ON 6) 제출 | 상세 페이지에 `topics=[...]` + `anonymous_mode=true` 반영 | Must | ⬜ |
| ISN-UI-003 | 태그 추가 — Enter | — | 주제 입력 후 Enter | 배지 추가, 입력창 초기화 | Must | ⬜ |
| ISN-UI-004 | 태그 추가 — 쉼표 | — | 주제 입력 후 `,` 키 | 배지 추가 (쉼표 제거) | Should | ⬜ |
| ISN-UI-005 | 태그 중복 방지 | 이미 `JPA` 추가됨 | 다시 `JPA` 입력 + Enter | 중복 추가 안 됨, 입력창만 초기화 | Should | ⬜ |
| ISN-UI-006 | 태그 삭제 | 태그 ≥ 1개 | 태그 배지 클릭 | 해당 태그 제거 | Should | ⬜ |
| ISN-UI-007 | 필수 필드 검증 — 제목 | 과목만 입력 | 제출 | "수업 제목과 과목을 입력해주세요." 에러 | Must | ⬜ |
| ISN-UI-008 | 필수 필드 검증 — 과목 | 제목만 입력 | 제출 | 동일 에러 | Must | ⬜ |
| ISN-UI-009 | 익명 모드 토글 | — | 토글 클릭 | `aria-checked` 상태 전환, 시각적 토글 이동 | Should | ⬜ |
| ISN-UI-010 | 카테고리 미선택 허용 | 카테고리 공란 | 제출 | 정상 생성 (`courseCategory: undefined`) | Must | ⬜ |
| ISN-UI-011 | 로딩 상태 | 제출 중 | — | 버튼 "생성 중..." + `disabled` | Should | ⬜ |
| ISN-UI-012 | 취소 버튼 | — | "취소" 클릭 | `/instructor`로 이동 | Should | ⬜ |
| ISN-UI-013 | 뒤로가기 링크 | — | "세션 목록으로" 클릭 | `/instructor`로 이동 | Could | ⬜ |
| ISN-UI-014 | 제목 500자 경계 | — | 500자 입력 후 제출 | 성공 또는 `400` (DB 컬럼 제약 확인) | Could | ⬜ |
| ISN-UI-015 | 제목 1자 | — | 제목 1자, 과목 1자 | 정상 생성 | Should | ⬜ |
| ISN-UI-016 | 태그 공백 문자열 | — | `"  "` 입력 후 Enter | 공백만인 태그 추가 안 됨 (trim 처리) | Should | ⬜ |
| ISN-UI-017 | 태그 특수문자 | — | `C++`, `Node.js` 입력 | 정상 배지 추가 | Should | ⬜ |
| ISN-UI-018 | 태그 한글 | — | `객체지향` 입력 | 정상 배지 추가 | Should | ⬜ |
| ISN-UI-019 | 태그 30개 추가 | — | 30회 태그 입력 | 모두 배지로 추가, UI 레이아웃 깨짐 없음 | Could | ⬜ |
| ISN-UI-020 | 생성 후 URL 확인 | — | 생성 성공 | URL이 `/instructor/sessions/{uuid}` 패턴 | Must | ⬜ |
| ISN-UI-021 | 카테고리 선택지 확인 | — | 카테고리 드롭다운 열기 | KIT 과정 카테고리 목록 노출 (Spring/React/Python 등) | Should | ⬜ |
| ISN-UI-022 | 탭 키 네비게이션 | — | Tab 키로 제목→과목→카테고리→태그→익명→제출 | 논리적 포커스 순서 | Should | ⬜ |
| ISN-UI-023 | 브라우저 뒤로가기 (생성 중) | 생성 API 호출 중 | 뒤로가기 | 로딩 취소, `/instructor`로 이동 — 고아 세션 방지 | Should | ⬜ |
| ISN-UI-024 | 생성 성공 후 뒤로가기 | 상세 페이지 도달 후 | 뒤로가기 | `/instructor/sessions/new` (빈 폼) 또는 `/instructor` | Could | ⬜ |
| ISN-UI-025 | 새로고침 (작성 중) | 제목/과목 입력 후 | F5 | 폼 초기화 (브라우저 기본), 경고 없음 | Could | ⬜ |

## 2. API 계약

| TC ID | 엔드포인트 | 요청 | 기대응답 | RLS/인가 | 우선순위 | 상태 |
|-------|-----------|------|---------|---------|---------|------|
| ISN-API-001 | `POST /api/sessions` | `{ title, subject, courseCategory?, topics: string[], anonymousMode: boolean }` | `201 { data: { id, ... } }` | `academy_id` 자동 바인딩 (서버에서 `auth.getUser` 후 프로필 조회) | Must | ⬜ |
| ISN-API-002 | 강사 외 role 요청 | 수강생 쿠키로 호출 | `403` 또는 `401` | role 체크 | Must | ⬜ |
| ISN-API-003 | 빈 필드 서버 검증 | `{ title: "", subject: "" }` | `400` + 에러 메시지 | Zod 검증 | Must | ⬜ |
| ISN-API-004 | 초기 상태 | 생성 응답 | `status = 'draft'` | — | Must | ⬜ |
| ISN-API-005 | `join_code` 초기값 | 생성 응답 | **`join_code`가 `null` 또는 응답에서 제외** (UI "수업을 시작하면 코드가 발급됩니다") | 회귀 포인트 | Must | ⬜ |
| ISN-API-006 | `topics` JSONB 저장 | `topics: ["JPA"]` | DB `sessions.topics = ["JPA"]` | — | Should | ⬜ |
| ISN-API-007 | mentor role 요청 | mentor 쿠키로 `POST /api/sessions` | `403` (mentor는 세션 생성 불가) | role 체크 | Must | ⬜ |
| ISN-API-008 | `academy_id` 자동 바인딩 확인 | 강사 가입 후 생성 | 응답 또는 DB 조회 | `sessions.academy_id = 강사.academy_id` | Must | ⬜ |
| ISN-API-009 | `anonymousMode` 기본값 | `anonymousMode` 생략 | `false` 기본값 적용 | — | Should | ⬜ |
| ISN-API-010 | `title` 500자 | 500자 제목 | `201` 또는 `400` (DB 제약 확인) | — | Could | ⬜ |
| ISN-API-011 | Zod — `topics` 배열 아닌 값 | `topics: "JPA"` (문자열) | `400` + Zod 에러 | — | Should | ⬜ |

## 3. Realtime

N/A

## 4. 에러 / 엣지

| TC ID | 시나리오 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|---------|------|
| ISN-ERR-001 | 서버 500 | 에러 메시지 표시, 로딩 해제, 폼 유지 | Should | ⬜ |
| ISN-ERR-002 | 매우 긴 제목 (500자) | DB 컬럼 길이 제약 에러 or 정상 저장 (정책 확인) | Could | ⬜ |
| ISN-ERR-003 | XSS 주입 — `title = "<script>alert(1)</script>"` | React 기본 escape로 안전하게 렌더 | Should | ⬜ |
| ISN-ERR-004 | 중복 제출 방지 | 빠른 더블클릭 시 `isLoading`으로 버튼 비활성화 | Must | ⬜ |
| ISN-ERR-005 | 네트워크 끊김 | `fetch` 실패 에러 메시지 | Should | ⬜ |
| ISN-ERR-006 | `profiles.academy_id` NULL인 강사 | 서버에서 `400` 또는 학원 바인딩 실패 안내 | Should | ⬜ |
| ISN-ERR-007 | SQL injection — `subject = "'; DROP TABLE sessions;--"` | Supabase 파라미터 바인딩으로 안전 처리 | Must | ⬜ |
| ISN-ERR-008 | 태그에 XSS — `<img onerror=alert(1)>` | 태그 배지 렌더 시 React escape, 스크립트 실행 없음 | Should | ⬜ |
| ISN-ERR-009 | 레이트 리밋 — 연속 10회 세션 생성 | DB 정상 처리 또는 서버 레이트 리밋 응답 | Could | ⬜ |
| ISN-ERR-010 | 인증 만료 중 제출 | 세션 만료 → `401` → 에러 메시지, 폼 유지 | Should | ⬜ |
| ISN-ERR-011 | 접근성 — `익명 모드` 토글 | `aria-checked`, `role="switch"` 속성 | Should | ⬜ |
| ISN-ERR-012 | 한국어 에러 — 필수 필드 | "수업 제목과 과목을 입력해주세요." 정확한 텍스트 | Must | ⬜ |
| ISN-ERR-013 | 한국어 에러 — 서버 에러 | 에러 발생 시 한국어 메시지, 영어 raw 에러 노출 안 됨 | Must | ⬜ |
| ISN-ERR-014 | `topics` 빈 배열로 생성 후 상세 진입 | `topics = []`인 세션 상세 페이지 | QuizPanel에서 `topics` 관련 렌더 시 크래시 없음 | Should | ⬜ |
