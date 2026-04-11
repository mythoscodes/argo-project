# Argos — 화면별 QA 테스트케이스 시트

> 2026 KIT 바이브코딩 공모전 데모 리허설·회귀 테스트 기준서
> 작성: 2026-04-10 · 팀 mythos

## 사용 방법

1. 데모 직전: 각 파일의 **Must** TC를 순서대로 실행하여 회귀 확인
2. QA 사이클: 새 기능 추가 시 해당 화면 파일에 TC 추가 (ID 네임스페이스 유지)
3. 결과 기록: `상태` 컬럼을 `⬜ → ✅/❌/⚠️`로 갱신

## 파일 인덱스 (15 화면)

### 공용 (미인증 / 역할 라우팅)
- [`common-home.md`](./common-home.md) — `/` (역할별 홈 리다이렉트)
- [`login.md`](./login.md) — `/login`
- [`register.md`](./register.md) — `/register`

### 강사 (instructor)
- [`instructor-dashboard.md`](./instructor-dashboard.md) — `/instructor`
- [`instructor-session-new.md`](./instructor-session-new.md) — `/instructor/sessions/new`
- [`instructor-session-detail.md`](./instructor-session-detail.md) — `/instructor/sessions/[id]` ★ **F1-F6 통합 (데모 핵심)**
- [`instructor-session-reports.md`](./instructor-session-reports.md) — `/instructor/sessions/[id]/reports`

### 수강생 (student)
- [`student-join.md`](./student-join.md) — `/student/join`
- [`student-session.md`](./student-session.md) — `/student/sessions/[id]`
- [`student-result.md`](./student-result.md) — `/student/sessions/[id]/result`
- [`student-report.md`](./student-report.md) — `/student/sessions/[id]/report`

### 멘토 (mentor)
- [`mentor-list.md`](./mentor-list.md) — `/mentor`
- [`mentor-student-detail.md`](./mentor-student-detail.md) — `/mentor/students/[id]`

### 원장 (owner)
- [`owner-dashboard.md`](./owner-dashboard.md) — `/owner`

---

## TC ID 네임스페이스

| 화면 | 접두사 |
|------|-------|
| `/` | `CMN` |
| `/login` | `LGN` |
| `/register` | `REG` |
| `/instructor` | `IDB` |
| `/instructor/sessions/new` | `ISN` |
| `/instructor/sessions/[id]` | `ISD` |
| `/instructor/sessions/[id]/reports` | `ISR` |
| `/student/join` | `SJN` |
| `/student/sessions/[id]` | `SSN` |
| `/student/sessions/[id]/result` | `SSR` |
| `/student/sessions/[id]/report` | `SSP` |
| `/mentor` | `MLS` |
| `/mentor/students/[id]` | `MSD` |
| `/owner` | `ODB` |

**포맷**: `{접두사}-{구분}-{3자리번호}`

**구분자**
| 구분 | 의미 |
|-----|------|
| `UI` | 화면 동작 (렌더링, 인터랙션, 폼, 리다이렉트) |
| `API` | 엔드포인트 계약 (요청/응답/Zod 검증/RLS 인가) |
| `RT` | Realtime 이벤트 (Supabase Realtime 채널 구독) |
| `ERR` | 에러·엣지·권한·네트워크 실패·레이트 리밋 |

**예시**
- `ISD-UI-001` 강사 세션 상세 — UI 1번 시나리오
- `ISD-API-003` 강사 세션 상세 — API 3번 시나리오
- `ISD-RT-002` 강사 세션 상세 — Realtime 2번 시나리오
- `ISD-ERR-005` 강사 세션 상세 — 에러 5번 시나리오

---

## 범례

### 우선순위 (MoSCoW)

| 라벨 | 의미 | 정의 |
|-----|------|------|
| **Must** | 필수 | 실패 시 **데모 차단**. 반드시 실행·통과해야 함 |
| **Should** | 권장 | 발견 시 수정. 데모 전 해결 목표 |
| **Could** | 선택 | 시간 여유 시 점검. 보너스 |

### 상태

| 기호 | 의미 |
|-----|------|
| ⬜ | Not Run (미실행) |
| ✅ | Pass |
| ❌ | Fail (이슈 티켓 필수) |
| ⚠️ | Blocked (선행 TC 실패로 실행 불가) |

---

## 데모 플로우 Must TC 커버리지 (크로스체크)

`docs/PLANNING.md` 데모 시나리오와 Must TC 대응표. 실행 순서대로 나열.

1. **강사 로그인** → `LGN-UI-001`, `LGN-API-001`
2. **강사 홈** → `CMN-UI-002`, `IDB-UI-001`
3. **세션 생성** → `ISN-UI-001`, `ISN-API-001`
4. **참여 코드 노출** → `ISD-UI-001`
5. **수강생 참여** → `SJN-UI-001`, `SJN-API-001`, `ISD-RT-001` (강사 화면 카운트 증가)
6. **AI 퀴즈 생성** → `ISD-UI-010`, `ISD-API-010`
7. **퀴즈 배포** → `SSN-RT-001` (수강생 수신)
8. **응답 제출** → `SSN-UI-002`, `SSN-API-001`, `ISD-RT-002` (강사 응답 카운트)
9. **히트맵 렌더링** → `ISD-UI-020`, `ISD-API-020`
10. **AI 코칭** → `ISD-UI-030`, `ISD-API-030`
11. **재퀴즈 (피드백 루프)** → `ISD-UI-040`
12. **세션 종료** → `ISD-UI-002`
13. **리포트 조회** — 강사: `ISR-UI-001` / 수강생: `SSP-UI-001`
14. **원장 대시보드** → `ODB-UI-001`, `ODB-API-001`

---

## 알려진 회귀 리스크 (QA 5사이클 기록)

| 포인트 | 관련 커밋 | TC 회귀 대상 |
|-------|----------|-------------|
| `join_code` 평문 노출 방지 | `236a658` (QA 3차) | `REG-ERR-001`, `ISD-ERR-001` |
| RLS 원장 격리 + role 체크 | `b081bed` (QA 2차) | `ODB-ERR-001`, `IDB-ERR-001`, `MSD-ERR-001` |
| `RISK_SPEED_INCREASE_RATIO` 매직넘버 상수화 | `06ed4d2` | `MLS-API-001` |
| **mentor role 리다이렉트 누락** (home/login/register에서 분기 없음) | — | `CMN-ERR-002`, `LGN-ERR-003`, `REG-ERR-003` |

---

## 참고 문서

- `docs/PLANNING.md` — 데모 시나리오, AI 전략
- `CLAUDE.md` — 코딩 규칙, AI 프롬프트/스키마 규칙
- `src/lib/constants.ts` — 임계값 상수 (TC 기대값 근거)
- `supabase/migrations/` — RLS 정책 (권한 TC 근거)
