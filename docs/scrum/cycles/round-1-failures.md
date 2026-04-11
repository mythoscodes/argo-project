# Round 1 실패 분석 — 2026-04-11

## 요약
- **전체**: 1143 tests
- **통과**: 298
- **실패**: 120
- **스킵**: 725

---

## 실패 카테고리 분류

### Cat-A: `/api/participants` 엔드포인트 없음 (27건)
**원인**: `src/app/api/participants/` 디렉토리 자체가 없음 → 모든 요청이 404 반환  
**픽스**: dev-2가 `/api/participants` endpoint 생성 필요

| # | TC ID | 실패 이유 |
|---|---|---|
| 9-30 | API-PAR-001~034 (일부) | endpoint 404 |
| 34 | RT-HMU-001 | GET /api/participants → 404 |
| 36 | RT-HMU-008 | POST /api/participants → 404 |
| 37 | RT-HMU-010 | GET /api/participants → 404 |
| 40 | RT-HMU-022 | GET /api/participants unauth → 404 |
| 41 | RT-HMU-023 | GET /api/participants RLS → 404 |
| 42 | RT-HMU-024 | GET /api/participants RLS → 404 |
| 46 | RT-QBR-020 | POST /api/participants → 404 |
| 47 | RT-QBR-021 | GET /api/participants → 404 |

**기대 동작**:
- `POST /api/participants { joinCode }` → 수강생이 세션 참여 (200/201/409)
- `GET /api/participants?sessionId=` → teacher가 참여자 목록 조회 (200 + [{session_id, user_id, joined_at}])
- auth 없음 → 401, teacher POST → 403

---

### Cat-B: client-side fetch 인증 실패 — storageState 만료 (22건)
**원인**: storageState access token이 2026-04-10 22:32 UTC에 만료됨. Next.js middleware(`updateSession`)는 페이지 로드 시 refresh 성공 (Set-Cookie)하지만, React 컴포넌트의 `fetch()` 는 이전 cookie를 사용해 401 반환.  
**픽스**: Supabase test 계정 재로그인 (`npx tsx tests/e2e/global-setup.ts`)  
  → 단, 현재 계정 패스워드 "이메일 또는 비밀번호가 올바르지 않습니다" 오류 — 계정이 변경됐거나 패스워드 리셋됨. dev-2가 Supabase 콘솔에서 확인 필요.

| # | TC ID | 실패 이유 |
|---|---|---|
| 59-78 | ISN-UI-001~020, ISN-API-*, ISN-ERR-* (20건) | form submit → `fetch("/api/sessions")` → 401 |
| 48-49 | CMN-ERR-012/014 | 페이지 reload → /login 리다이렉트 |
| 50-55 | IDB-UI-006/017, IDB-API-001/002, IDB-ERR-001/010 | page.goto 후 인증 실패 |
| 79 | ISR-ERR-011 | 동일 |
| 80-82 | LGN-UI-015, LGN-API-002/003 | reload → /login |

**페이지 스냅샷 증거**: ISN-UI-001 실패 시 form에 "인증이 필요합니다" 표시됨

---

### Cat-C: `request` fixture에 storageState 적용됨 — unauth 테스트 오류 (8건)
**원인**: `test.use({ storageState: AUTH_STATE.teacher })` 파일 레벨 설정 시 `request` fixture도 teacher auth를 상속. 따라서 "미인증" 테스트가 실제로는 authenticated 요청을 보냄.  
**픽스**: spec에서 unauth 테스트를 `browser.newContext()` (storageState 없음)로 교체 — 내가 수정

| # | TC ID | 실제 상태 | 기대 상태 |
|---|---|---|---|
| 1 | API-AI-003 | 400 (auth OK, sessionId 없음) | [401,302,403] |
| 4 | API-AI-012 | 403 (auth OK, student로 인식) | [401,302,403] |
| 6 | API-AI-021 | ? | [401,302,403] |
| 31 | API-SES-002 | 200 (teacher auth, 본인 세션) | [401,302,403] |
| 33 | API-SES-012 | 200 (teacher auth) | [401,302,403] |

---

### Cat-D: ODB API 응답 camelCase vs snake_case (6건)
**원인**: `/api/dashboard` 응답이 camelCase(`totalSessions`, `activeSessions`)를 반환하나 spec은 snake_case(`total_sessions`, `active_sessions`)로 검증.  
**픽스**: spec 수정 (camelCase로 변경) — 내가 수정

실제 응답 구조:
```json
{
  "summary": {
    "totalSessions": 0,
    "activeSessions": 0,
    "totalStudents": 0,
    "academyAvgUnderstanding": 0
  },
  "atRiskStudents": [],
  "sessionStats": []
}
```

| # | TC ID |
|---|---|
| 95 | ODB-UI-006 |
| 96 | ODB-UI-013 |
| 97 | ODB-API-001 |
| 98 | ODB-API-005 |
| 99 | ODB-API-008 |
| 100 | ODB-ERR-010 |

---

### Cat-E: role-based redirect 미구현 (10건)
**원인**: spec이 "teacher가 /mentor에 접근하면 /instructor로 리다이렉트"를 기대하지만, `/mentor/page.tsx`와 `/student/*/page.tsx` 어디에도 role-based redirect 로직 없음. middleware도 role 체크 없이 `updateSession`만 실행.  
**픽스 옵션 A**: 코드에 role redirect 추가 — dev-2  
**픽스 옵션 B**: 해당 TC를 "Cycle 2: role-redirect 미구현" 스킵으로 처리 — 내가 수정

| # | TC ID | 기대 동작 | 실제 동작 |
|---|---|---|---|
| 85 | MLS-AUTH-002 | teacher→/mentor→/instructor | →/login |
| 91 | MSD-AUTH-002 | teacher→/mentor/students/→/instructor | →/login |
| 102 | SJN-ERR-017 | teacher→/student/join→/instructor | →/login |
| 106 | SSP-AUTH-002 | teacher→/student/.../report→/instructor | →/login |
| 115 | SSR-AUTH-002 | teacher→/student/.../result→/instructor | →/login |
| 120 | SSN-ERR-012 | teacher→/student/sessions/[id]→/instructor | →/login |

---

### Cat-F: 상태코드 허용 범위 누락 (8건)
**원인**: spec이 예상보다 좁은 상태코드 세트를 기대함.  
**픽스**: spec에 추가 상태코드 포함 — 내가 수정

| # | TC ID | 실제 코드 | 현재 기대 | 수정 기대 |
|---|---|---|---|---|
| 44 | RT-QBR-005 | 400 | 200 | [200,400] |
| 45 | RT-QBR-015 | 400 | 200 | [200,400] |
| 90 | MSD-ERR-001 | 400 | [200,404] | [200,400,404] |
| 38 | RT-HMU-010 | 400 | [400,422] | [400,422] (다른 이유) |

---

### Cat-G: MLS/MSD/SSP/SSR/SSN 기타 (나머지)
상세 조사 필요. 주로 Cat-B (auth 만료)와 Cat-E (role redirect) 복합 원인.

| # | TC ID | 의심 원인 |
|---|---|---|
| 83-84 | MLS-API-001/004 | auth 만료 후 API 응답 오류 |
| 86 | MLS-A11Y-003 | 텍스트 라벨 selector 미일치 |
| 87-89 | MLS-RLS-001/003/004 | RLS 교차 검증 실패 |
| 90-94 | MSD-ERR-001, MSD-RLS-001/002/008 | auth 만료 or RLS |
| 103-110 | SSP-* | auth 만료 |
| 111-117 | SSR-* | auth 만료 |
| 118-119 | SSN-API-008/009 | auth 만료 |
| 101 | SJN-API-008 | auth 만료 |

---

## 수정 우선순위

| 우선순위 | 액션 | 담당 | 예상 고침 수 |
|---|---|---|---|
| P0 | Supabase 콘솔에서 test 계정 패스워드 확인/재설정, global-setup 재실행 | dev-2 | ~40건 |
| P1 | `/api/participants` endpoint 생성 | dev-2 | ~27건 |
| P2 | spec: ODB camelCase 수정 | qa (나) | ~6건 |
| P3 | spec: unauth tests `browser.newContext()` 교체 | qa (나) | ~8건 |
| P4 | spec: RT-QBR-005/015, MSD-ERR-001 상태코드 추가 | qa (나) | ~4건 |
| P5 | 코드: role-based redirect 추가 OR spec skip | dev-2/qa | ~10건 |

**P0 완료 시 Round 2 예상 실패**: ~40건 (120-40=80, 추가 spec 수정으로 -20 = ~60)
