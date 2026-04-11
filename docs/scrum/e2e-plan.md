# E2E 테스트 계획서

> 스프린트: `argos-mentor-fix` · 작성: QA · 날짜: 2026-04-10

## 목표

AC-5(회귀 4건 자동화), AC-6(Playwright 인프라), AC-7(Must 시나리오 100% 통과)를 Playwright E2E 스펙으로 구현한다.

---

## 시나리오 목록

| 스펙 파일 | 커버 AC | 시나리오 수 | 핵심 내용 |
|----------|---------|-----------|---------|
| `01-mentor-auth.spec.ts` | AC-1~4 | 8개 | mentor 회원가입, 로그인, 홈 리다이렉트, /mentor role 가드 |
| `02-regression.spec.ts` | AC-5 | 7개 | join_code 노출, owner role 체크, RISK_SPEED_INCREASE_RATIO, register UI mentor 옵션 |
| `03-instructor-flow.spec.ts` | 데모 플로우 | 5개 | 강사 세션 생성, draft→active, 참여코드 노출 |
| `04-build-integrity.spec.ts` | AC-8 | 5개 | 페이지 로드, JS 에러 없음 |

**총 25개 테스트**

---

## 테스트 계정 전략

전략 **B 채택**: 실제 `POST /api/auth/register` API 호출 (mentor 가입 자체가 AC-1 검증).

### 계정 구성

| 역할 | 이메일 | 비고 |
|------|-------|------|
| owner | `e2e-owner@test.argos` | 학원 생성 (`E2E 테스트 학원`) |
| teacher | `e2e-teacher@test.argos` | E2E 학원 소속 |
| student | `e2e-student@test.argos` | E2E 학원 소속 |
| mentor | `e2e-mentor@test.argos` | AC-1 fix 후 생성 가능 |

### 시드 흐름

```
global-setup.ts
  1. POST /api/auth/register (owner)  → academy 생성
  2. POST /api/auth/register (teacher/student/mentor)
  3. Chromium 브라우저로 각 계정 로그인 → storageState 저장
     → tests/e2e/fixtures/.auth/{role}.json
```

- 409 응답(이미 존재) = 정상으로 처리
- `.auth/*.json` 파일은 `.gitignore` 처리됨 (Supabase 토큰 포함)

---

## AI 스텁 방침

`/api/ai/**` 엔드포인트는 `page.route()` 스텁 응답으로 대체한다.

- **이유**: 실제 Gemini 호출은 느리고 비결정적; AC-1~5 검증에 AI 응답 내용이 불필요
- **적용 범위**: `03-instructor-flow.spec.ts` 의 `beforeEach`에서 `stubAiRoutes(page)` 호출
- **스텁 응답**: `tests/e2e/fixtures/helpers.ts`에 정의

AC-1~4, AC-5, AC-8 검증에는 AI 호출 자체가 불필요하므로 스텁 없이 진행.

---

## 실행 방법

### 사전 준비

```bash
# 1. 로컬 dev 서버 실행 (별도 터미널)
pnpm dev

# 2. 또는 playwright가 자동으로 기동 (playwright.config.ts webServer 설정)
```

### 테스트 실행

```bash
# 전체 실행
pnpm test:e2e

# UI 모드 (디버깅)
pnpm test:e2e:ui

# 특정 스펙만
npx playwright test tests/e2e/01-mentor-auth.spec.ts

# 스펙 목록 확인
npx playwright test --list
```

### 환경변수

```bash
# 커스텀 베이스 URL (기본: http://localhost:3000)
PLAYWRIGHT_BASE_URL=http://localhost:3001 pnpm test:e2e
```

---

## 스펙별 상세 시나리오

### 01-mentor-auth.spec.ts (AC-1~4)

| 테스트 | TC ID | 설명 |
|-------|-------|------|
| mentor 가입 API 201 | REG-API-001 | `role=mentor` → 201, 응답에 join_code 없음 |
| 유효하지 않은 role → 400 | REG-API-005 | `role=admin` → 400 |
| mentor 로그인 → /mentor | LGN-ERR-003 | AC-2 |
| / mentor 세션 → /mentor | CMN-ERR-002 | AC-3 |
| /mentor + teacher → /instructor | MLS-ERR-001 | AC-4 |
| /mentor + student → /student/join | MLS-ERR-001 | AC-4 |
| /mentor + owner → /owner | MLS-ERR-001 | AC-4 |
| /mentor 미인증 → /login | MLS-ERR-001 | AC-4 |
| /mentor/students/[id] + teacher → /instructor | MSD-ERR-001 | AC-4 하위 경로 |

### 02-regression.spec.ts (AC-5 회귀 4건)

| 테스트 | 회귀 # | 검증 지점 |
|-------|-------|---------|
| POST /api/auth/register 응답 join_code 없음 | #1 | REG-ERR-001 |
| draft 세션 GET join_code null/없음 | #1 | ISD-ERR-001 |
| teacher → /owner 접근 차단 | #2 | ODB-ERR-001 |
| student → /owner 접근 차단 | #2 | ODB-ERR-001 |
| RISK_SPEED_INCREASE_RATIO constants.ts 존재 | #3 | 커밋 06ed4d2 |
| 하드코딩 1.3 없음 (mentor 파일) | #3 | CLAUDE.md §20 |
| /register UI mentor 옵션 존재 | #4 | REG-ERR-003 |

### 03-instructor-flow.spec.ts (데모 플로우)

| 테스트 | TC ID | 설명 |
|-------|-------|------|
| / → /instructor 리다이렉트 | CMN-UI-002 | 강사 홈 |
| 강사 대시보드 렌더링 | IDB-UI-001 | 세션 목록 로드 |
| 새 세션 생성 | ISN-UI-001 | 폼 → 세션 상세 이동 |
| draft → active + 참여코드 | ISD-UI-001, ISD-UI-002 | 핵심 데모 플로우 |
| draft 세션 DOM에 join_code 없음 | ISD-ERR-001 | 회귀 중복 커버 |

### 04-build-integrity.spec.ts (AC-8)

| 테스트 | 설명 |
|-------|------|
| /login 로드 + JS 에러 없음 | 진입점 무결성 |
| /register 로드 | 회원가입 페이지 |
| /instructor 로드 | 강사 대시보드 |
| /mentor 로드 | 멘토 대시보드 |
| 존재하지 않는 경로 → 크래시 없음 | 404 처리 |

---

## DoD §2-3 체크리스트

- [ ] `docs/tc/README.md` 회귀 리스크 테이블 4행에 "자동 회귀로 커버됨" 주석 추가 (T7 완료 후)
- [ ] `CMN-ERR-002` (common-home.md) 상태 ✅ 업데이트 (T7 완료 후)
- [ ] `LGN-ERR-003` (login.md) 상태 ✅ 업데이트 (T7 완료 후)
- [ ] `REG-ERR-003` (register.md) 상태 ✅ 업데이트 (T7 완료 후)
