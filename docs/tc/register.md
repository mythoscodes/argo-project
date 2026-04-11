# TC — 회원가입

| 항목 | 값 |
|------|---|
| 라우트 | `/register` |
| 파일 | `src/app/register/page.tsx`, `src/app/api/auth/register/route.ts` |
| 역할 | 공용 |
| 관련 기능 | 계정 생성 + 역할/학원 바인딩 |
| 주요 API | `POST /api/auth/register`, 가입 후 `auth.signInWithPassword` |
| Realtime 채널 | N/A |

> 원장은 신규 학원 생성, 강사/수강생/mentor는 기존 학원에 자동 바인딩. 가입 성공 시 자동 로그인 후 역할별 홈으로 리다이렉트.

## 1. UI 시나리오

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| REG-UI-001 | 원장 가입 (신규 학원 생성) | `academies` 테이블 비어있거나 신규 학원 필요 | 1) 이름·이메일·비밀번호·비밀번호 확인 2) 역할 = 원장 3) 학원명 입력 4) 제출 | 201 → 자동 로그인 → `/owner`로 이동, `academies` 테이블에 새 행, `profiles.academy_id` 연결됨 | Must | ⬜ |
| REG-UI-002 | 강사 가입 | 최소 1개 학원 존재 | 역할 = 강사, 학원명 필드 노출 안 됨 | 201 → `/instructor`로 이동, 첫 번째 학원에 자동 바인딩 | Must | ⬜ |
| REG-UI-003 | 수강생 가입 | 최소 1개 학원 존재 | 역할 = 수강생 | `/student/join`으로 이동 | Must | ⬜ |
| REG-UI-004 | **mentor 가입** | 최소 1개 학원 존재 | 역할 = mentor 선택 | 201 → `/mentor`로 이동, 학원에 바인딩 | Must | ⬜ |
| REG-UI-005 | 역할 미선택 | — | 역할 미선택 상태로 제출 | "역할을 선택해주세요." 에러 (클라이언트 차단) | Must | ⬜ |
| REG-UI-006 | 원장 역할인데 학원명 공란 | 역할 = 원장 | 학원명 공란 제출 | "학원명을 입력해주세요." 에러 | Must | ⬜ |
| REG-UI-007 | 비밀번호 불일치 | — | 비밀번호 ≠ 확인 필드 | "비밀번호가 일치하지 않습니다." 에러 | Must | ⬜ |
| REG-UI-008 | 비밀번호 최소 길이 | — | 5자 미만 입력 | `minLength={6}` 브라우저 검증 차단 | Should | ⬜ |
| REG-UI-009 | 역할 설명 노출 | — | 역할 선택 시 | 선택된 역할의 `description` 한 줄 노출 | Could | ⬜ |
| REG-UI-010 | 가입 후 자동 로그인 실패 | 가입 성공했으나 `signInWithPassword` 에러 | — | `/login`으로 이동 (수동 로그인 유도) | Should | ⬜ |
| REG-UI-011 | mentor 역할 설명 노출 | ROLE_OPTIONS에 mentor 항목 존재 | mentor 선택 | mentor description 한 줄 노출 | Must | ⬜ |
| REG-UI-012 | 이메일 형식 검증 | — | `abc` 입력 후 제출 | `type="email"` 브라우저 검증 | Should | ⬜ |
| REG-UI-013 | 이름 필드 필수 | — | 이름 공란 제출 | 에러 또는 `required` 차단 | Must | ⬜ |
| REG-UI-014 | 로딩 상태 | 제출 중 | — | 버튼 비활성화 + "가입 중..." 표시 | Should | ⬜ |
| REG-UI-015 | 로그인 링크 | — | "이미 계정이 있으신가요?" 링크 클릭 | `/login`으로 이동 | Should | ⬜ |
| REG-UI-016 | 역할별 학원명 필드 동적 노출 | 원장 선택 시 | 역할 전환 | 원장: 학원명 필드 노출 / 기타: 숨김 | Must | ⬜ |
| REG-UI-017 | 이름 50자 경계 | — | 50자 정확히 입력 | 성공 | Should | ⬜ |
| REG-UI-018 | 이름 51자 초과 | — | 51자 입력 후 제출 | `400` 에러, "이름은 50자 이하여야 합니다." | Should | ⬜ |
| REG-UI-019 | 가입 성공 후 새로고침 | 가입 → 자동 로그인 → `/instructor` | F5 | 세션 유지, `/instructor` 유지 | Should | ⬜ |
| REG-UI-020 | 가입 성공 후 뒤로가기 | — | 뒤로가기 | 역할별 홈 또는 `/` 리다이렉트 (이미 로그인) | Should | ⬜ |

## 2. API 계약

| TC ID | 엔드포인트 | 요청 | 기대응답 | RLS/인가 | 우선순위 | 상태 |
|-------|-----------|------|---------|---------|---------|------|
| REG-API-001 | `POST /api/auth/register` 원장 | `{ email, password, display_name, role: "owner", academy_name }` | `201 { data: { user_id, role: "owner" } }`, `academies` insert + `profiles` insert | admin client 사용 | Must | ⬜ |
| REG-API-002 | `POST /api/auth/register` 강사/수강생 | `{ email, password, display_name, role }` | `201`, 첫 번째 학원에 자동 바인딩 | — | Must | ⬜ |
| REG-API-003 | `POST /api/auth/register` **mentor** | `{ email, password, display_name, role: "mentor" }` | `201`, 학원 바인딩, `/mentor` 리다이렉트 | — | Must | ⬜ |
| REG-API-004 | Zod 검증 실패 — 이메일 형식 | `email = "abc"` | `400 { error }` | — | Must | ⬜ |
| REG-API-005 | Zod 검증 실패 — 비밀번호 < 6자 | `password = "12345"` | `400 { error: "비밀번호는 6자 이상이어야 합니다" }` | — | Must | ⬜ |
| REG-API-006 | Zod 검증 실패 — role 외 값 | `role = "admin"` | `400 { error }` | — | Must | ⬜ |
| REG-API-007 | 학원 없음 (강사/수강생/mentor) | `academies` 비어있음 | `400 { error: "등록 가능한 학원이 없습니다. 원장이 먼저 가입해야 합니다." }` | — | Must | ⬜ |
| REG-API-008 | 중복 이메일 | 이미 가입된 이메일 | `409 { error: "이미 가입된 이메일입니다." }` | — | Must | ⬜ |
| REG-API-009 | `profiles` insert 실패 | DB 제약 위반 유도 | `500` + auth 유저 자동 롤백 삭제 | — | Should | ⬜ |
| REG-API-010 | `display_name` 50자 초과 | 51자 | `400 { error }` | — | Should | ⬜ |
| REG-API-011 | `academy_name` 100자 초과 | 101자 | `400 { error }` | — | Could | ⬜ |
| REG-API-012 | `display_name` 공란 | `""` | `400 { error }` | — | Must | ⬜ |
| REG-API-013 | `password` 1000자 | 매우 긴 비밀번호 | 에러 반환 또는 성공 (Supabase 처리) | — | Could | ⬜ |
| REG-API-014 | 응답에 `join_code` 포함 여부 | 원장 가입 | 응답 JSON | `join_code` 필드 **절대 포함 안 됨** (REG-ERR-001 회귀) | Must | ⬜ |
| REG-API-015 | `academy_id` 바인딩 정확성 | 강사 가입 | `profiles` 행 | `academy_id`가 첫 번째 `academies` 행 id와 일치 | Must | ⬜ |
| REG-API-016 | mentor Zod enum 포함 확인 | `role: "mentor"` | `201` (enum에 mentor 존재) | — | Must | ⬜ |
| REG-API-017 | 레이트 리밋 — 연속 5회 가입 시도 | 동일 IP | 5번째 요청 | Supabase Auth 레이트 리밋 응답 처리 | Could | ⬜ |

## 3. Realtime

N/A

## 4. 에러 / 엣지

| TC ID | 시나리오 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|---------|------|
| REG-ERR-001 | `join_code` 노출 방지 회귀 | 가입 응답 JSON/네트워크 패널에 학원 `join_code` 필드가 포함되지 않음 (커밋 `236a658` 회귀) | Must | ⬜ |
| REG-ERR-002 | 학원 insert 실패 → auth 유저 생성 중단 | `academies` insert 에러 시 `auth.createUser`가 호출되지 않음 (고아 계정 방지) | Must | ⬜ |
| REG-ERR-003 | **mentor 역할 회원가입 가능** | UI `ROLE_OPTIONS`에 mentor 존재 + API enum에 mentor 존재 → 201 성공 (회귀 수정 완료) | Must | ⬜ |
| REG-ERR-004 | 원장 가입 중복 학원명 | `academies.name`에 UNIQUE 제약 없음 가정 시 중복 허용 (정책 확인) | Could | ⬜ |
| REG-ERR-005 | XSS 주입 시도 — `display_name = "<script>alert(1)</script>"` | 저장되나 UI 렌더링 시 React 기본 escape로 안전 | Should | ⬜ |
| REG-ERR-006 | 가입 직후 새로고침 | 자동 로그인 완료 후라면 역할별 홈 유지 | Could | ⬜ |
| REG-ERR-007 | SQL injection — `academy_name = "'; DROP TABLE academies;--"` | Supabase 파라미터 바인딩으로 안전 처리 | Must | ⬜ |
| REG-ERR-008 | 이름에 이모지 포함 `"홍길동🎉"` | 저장 성공 또는 DB 제약 에러 처리 (크래시 없음) | Could | ⬜ |
| REG-ERR-009 | 네트워크 단절 중 제출 | `fetch` 실패 에러 메시지, 로딩 해제 | Should | ⬜ |
| REG-ERR-010 | 중복 제출 방지 | 빠른 더블클릭 | `isLoading`으로 버튼 비활성화, 단일 API 호출 | Must | ⬜ |
| REG-ERR-011 | 한국어 에러 메시지 — 중복 이메일 | "이미 가입된 이메일입니다." 정확한 텍스트 | Must | ⬜ |
| REG-ERR-012 | 한국어 에러 메시지 — 비밀번호 불일치 | "비밀번호가 일치하지 않습니다." 정확한 텍스트 | Must | ⬜ |
| REG-ERR-013 | 접근성 — ARIA | 에러 메시지 `role="alert"`, 역할 선택 `aria-label` | Should | ⬜ |
| REG-ERR-014 | `profiles.academy_id` NULL 방지 | 강사 가입 후 `profiles` 조회 | `academy_id` 반드시 존재 (NULL이면 mentor/강사 기능 전체 불가) | Must | ⬜ |
| REG-ERR-015 | mentor 가입 후 학원 바인딩 확인 | mentor 가입 | `profiles.academy_id` = 학원 ID | Must | ⬜ |
| REG-ERR-016 | `email = " "` (공백만) | `type="email"` 차단 또는 Supabase 에러 | Should | ⬜ |
| REG-ERR-017 | 비밀번호 확인 필드 붙여넣기 | 비밀번호 필드와 동일 값 붙여넣기 | 일치로 처리, 정상 제출 | Could | ⬜ |
| REG-ERR-018 | ARIA — 폼 필드 레이블 | 모든 input에 연결된 `<label>` 존재 | Should | ⬜ |
