# Sprint AC — Argos mentor fix + 회귀 전수 점검

> 스프린트: `argos-mentor-fix` · 작성: 2026-04-10 · Planner
>
> 대상: analyst / critic / dev / qa 전원. 본 문서는 구현·리뷰·테스트의 **단일 기준(Single Source of Truth)** 이다. 범위를 넘는 작업은 "Out of scope"에 해당하며 금지한다.

## 배경

F1–F9 구현 완료 + QA 5사이클 이후, mentor role 라우팅 경로가 **유령 상태**로 남아있음.
- `/` (`src/app/page.tsx`) · `/login` · `/register` 모두 mentor 분기 없음 → `default: '/login'`으로 떨어지며 무한 리다이렉트 가능
- `/mentor` 레이아웃에 role 가드 없음 → student/teacher가 직접 URL 진입 시 페이지가 그대로 렌더됨
- `POST /api/auth/register` Zod enum이 `['owner', 'teacher', 'student']`만 허용 → mentor 계정 생성 수단 부재 (수동 SQL만 가능)

동시에 QA 5사이클 동안 축적된 **알려진 회귀 리스크** (`docs/tc/README.md` §알려진 회귀 리스크) 가 여전히 자동 테스트로 보호되지 않는다. Playwright 인프라가 없어 회귀 방지 자동화 또한 없다.

본 스프린트는 위 세 축(**mentor 유령 라우트 제거 / 회귀 리스크 전수 확인 / Playwright E2E 자동화**) 을 한 번에 닫는다.

---

## Acceptance Criteria (AC)

각 AC는 **관측 가능한 결과**로 기술한다. Dev 는 구현, QA 는 Playwright 스펙으로 1:1 매핑해 검증한다.

### AC-1. mentor 계정이 회원가입 가능
- `POST /api/auth/register` 의 Zod `role` enum 에 `'mentor'` 가 포함된다.
- `/register` UI 의 `ROLE_OPTIONS` 에 mentor 항목이 존재하고 description 이 노출된다.
- mentor 로 가입 성공 시 HTTP 201 + 자동 로그인 후 **`/mentor`** 로 리다이렉트된다.
- 응답 JSON 에 `academies.join_code` 가 절대 포함되지 않는다 (REG-ERR-001 회귀).
- 매핑 TC: `REG-UI-xxx`(추가), `REG-API-001~005`, `REG-ERR-003`.

### AC-2. mentor 이메일 로그인이 `/mentor` 로 리다이렉트
- `/login` 로그인 로직의 역할 분기 `switch` 에 `case 'mentor': router.push('/mentor')` 가 존재한다.
- mentor 계정으로 로그인 시 폼 제출 직후 경로가 `/mentor` 이며, `/login` 으로의 2차 리다이렉트가 일어나지 않는다.
- 매핑 TC: `LGN-UI-xxx`(추가 mentor), `LGN-ERR-003`.

### AC-3. `/` 홈 리다이렉트가 mentor 를 인식
- `src/app/page.tsx` 의 역할 분기에서 `role === 'mentor'` 일 때 `redirect('/mentor')` 를 수행한다.
- 미인증 · 세션만료 · `profiles` 누락 · 알 수 없는 role 은 여전히 `/login` 으로 떨어진다 (기존 동작 회귀 없음).
- 매핑 TC: `CMN-UI-001~004`, `CMN-ERR-001~004`.

### AC-4. `/mentor` 레이아웃에 role 가드
- `src/app/mentor/layout.tsx` (또는 동등한 서버 컴포넌트) 에서 `auth.getUser()` + `profiles.role` 조회 후, mentor 가 아닌 유저는 각자의 홈 (`teacher → /instructor`, `student → /student/join`, `owner → /owner`, 미인증 → `/login`) 으로 리다이렉트한다.
- 직접 URL `/mentor` / `/mentor/students/[id]` 진입에도 가드가 적용된다.
- 매핑 TC: `MLS-ERR-xxx`(신규), `MSD-ERR-001`.

### AC-5. 알려진 회귀 리스크 4건이 자동 회귀 테스트로 고정됨
QA 5사이클에서 식별된 모든 회귀 포인트가 Playwright 스펙으로 1건 이상 커버된다. 실패 시 CI/로컬에서 즉시 가시화.

| # | 리스크 | Playwright 검증 지점 |
|---|--------|---------------------|
| 1 | `join_code` 평문 노출 | `/register` 201 응답 JSON에 `join_code` 키 부재 · `/instructor/sessions/[id]` 페이지 DOM 에 `join_code` 평문 부재 |
| 2 | 원장 대시보드 role 체크 · RLS 격리 | student/teacher 로 `/owner` 직접 진입 → `/` 또는 본인 홈으로 리다이렉트 |
| 3 | `RISK_SPEED_INCREASE_RATIO` 상수화 | `/mentor` API `MLS-API-001` 응답에 risk 판정 포함, 하드코딩 `1.3` 참조 없음 (grep 보조 확인) |
| 4 | mentor role 라우팅 (본 스프린트 신규) | AC-1~4 가 모두 녹색 |

### AC-6. Playwright 인프라가 정식 설치된다
- `package.json` 의 **devDependencies** 에 `@playwright/test` 추가 (`CLAUDE.md §7` 허용 범위).
- `playwright.config.ts` 가 리포지토리 루트에 존재하며, 다음을 만족한다:
  - `baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'`
  - `webServer` 로 `next dev` 자동 기동 (또는 로컬 수동 기동 문서화)
  - `testDir = 'tests/e2e'`
  - `reporter = 'list'` (CI 단순화)
- `tests/e2e/` 하위에 본 AC 를 커버하는 스펙이 존재한다 (mentor-auth.spec.ts, regression.spec.ts 권장).
- `npm run test:e2e` 스크립트가 `package.json` 에 존재한다.

### AC-7. Must 시나리오 Playwright 실행 100% 통과
- Dev 로컬 서버 또는 Playwright `webServer` 기동 상태에서 `npm run test:e2e` 실행 시 **모든 AC 에 대응하는 스펙이 녹색**.
- 실행 로그(요약)가 `docs/scrum/sprint-report.md` 에 첨부된다.
- 실패 0건. Flaky (retry 후 pass) 는 허용하지 않는다.

### AC-8. 빌드 / 타입 / Lint 무결성
- `npm run build` 성공 (빌드 워닝 0개, `CLAUDE.md §18`).
- `npm run lint` 워닝 0개.
- `any` 신규 도입 0건, `console.log` 0건 (`CLAUDE.md §16–17`).
- 신규 매직 넘버 0건 — 임계값은 `src/lib/constants.ts` 에 집중 (`CLAUDE.md §20`).

---

## Definition of Done (DoD)

하나라도 미충족이면 PR 머지 불가·보고서 "완료" 표기 금지.

1. AC-1 ~ AC-8 전부 녹색.
2. `docs/tc/README.md` §알려진 회귀 리스크 테이블 4행 전부 **자동 회귀로 커버됨** 주석이 추가됨.
3. `docs/tc/common-home.md`·`login.md`·`register.md` 의 mentor 관련 TC (`CMN-ERR-002`, `LGN-ERR-003`, `REG-ERR-003`) 상태가 ✅.
4. `supabase/migrations/` 신규 마이그레이션이 추가되었다면 RLS 포함 여부를 critic 이 검토 완료 (`CLAUDE.md §4`).
5. Planner 가 `docs/scrum/sprint-report.md` 에 최종 보고서 (요약 / 남은 리스크 / 다음 스텝) 를 작성.

---

## Out of Scope (명시적 금지 — 건드리지 말 것)

- 새로운 기능 (F10+) 추가
- `src/app/(instructor|student|owner)` UI 재디자인 — `CLAUDE.md §7` 위반
- shadcn/ui 외 신규 UI 라이브러리 도입
- AI 프롬프트 수정 · temperature 튜닝 · 모델 변경
- DB 스키마의 mentor 관련 필드 확장 (현재 `profiles.role` enum 에 mentor 가 이미 존재한다는 전제. analyst 가 다르게 보고하면 별도 마이그레이션 티켓으로 분리)
- Vercel 배포 · 원격 푸시 (Dev 는 로컬까지만)
- CI/GitHub Actions 구성 (로컬 `npm run test:e2e` 까지가 스프린트 범위)
- Owner 대시보드 / F8 완성 작업

---

## 팀원 접점

| 역할 | 소유 산출물 | 참조해야 하는 AC |
|------|------------|-----------------|
| **analyst** | 코드 현황 리포트 (`docs/scrum/analysis.md` 제안) | 전부 — 특히 AC-1~4 현재 상태와 회귀 테이블 매핑 확인 |
| **critic** | 분석 리뷰 + 최종 검증 | AC-5, AC-8, DoD §4 |
| **dev** | mentor fix 구현 + Playwright 인프라 | AC-1~6, AC-8 |
| **qa** | Playwright 스펙 + 실행 결과 | AC-5, AC-6, AC-7, DoD §2–3 |
| **planner** | 본 문서 + 최종 보고 | 없음 (감독) |

질문/이슈는 planner 에게 SendMessage. plain text 출력은 팀에 전달되지 않는다.
