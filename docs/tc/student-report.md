# TC — 수강생 학습 리포트

| 항목 | 값 |
|------|---|
| 라우트 | `/student/sessions/[id]/report` |
| 파일 | `src/app/student/sessions/[id]/report/page.tsx` |
| 역할 | 수강생 |
| 관련 기능 | F7 리포트 — 수강생 뷰 |
| 주요 API | `GET /api/ai/report?sessionId`, `POST /api/ai/report` |
| Realtime 채널 | N/A |

> AI가 개인 응답을 분석해 개념별 이해도 레이더 차트 + 취약 개념 + 학습 추천을 제시.

---

## 1. UI 시나리오

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| SSP-UI-001 | 기존 리포트 로드 | `GET /api/ai/report`에 데이터 있음 | 진입 | 레이더 차트 + 취약 개념 + AI 학습 추천 3섹션 렌더 | Must | ⬜ |
| SSP-UI-002 | 리포트 미생성 — CTA | `GET /api/ai/report` null 응답 | 진입 | "아직 리포트가 생성되지 않았습니다" + "AI 리포트 생성" 버튼 | Must | ⬜ |
| SSP-UI-003 | 리포트 생성 | — | "AI 리포트 생성" 클릭 | 로딩 "생성 중..." → 리포트 렌더 | Must | ⬜ |
| SSP-UI-004 | 레이더 차트 렌더 | `understanding_summary` ≥ 3개 토픽 | — | Recharts `RadarChart`로 토픽별 0-100 스케일 표시 | Must | ⬜ |
| SSP-UI-005 | 취약 개념 배지 | `weak_topics.length > 0` | — | destructive 배지 리스트 + "이 개념들에 대한 추가 학습을 권장합니다" 안내 | Must | ⬜ |
| SSP-UI-006 | 취약 개념 0개 | `weak_topics = []` | — | 취약 개념 카드 미노출 | Should | ⬜ |
| SSP-UI-007 | AI 학습 추천 | `recommendations` 존재 | — | 파란 배경 박스 + whitespace-pre-wrap | Must | ⬜ |
| SSP-UI-008 | 추천 없음 | `recommendations` null | — | 추천 카드 미노출 | Should | ⬜ |
| SSP-UI-009 | 결과로 복귀 | — | "결과로 돌아가기" 클릭 | `/student/sessions/[id]/result`로 이동 | Should | ⬜ |
| SSP-UI-010 | 레이더 차트 토픽 0개 | `understanding_summary = {}` | — | 레이더 차트 카드 숨김 | Should | ⬜ |

---

## 2. API 계약

| TC ID | 엔드포인트 | 요청 | 기대응답 | RLS/인가 | 우선순위 | 상태 |
|-------|-----------|------|---------|---------|---------|------|
| SSP-API-001 | `GET /api/ai/report?sessionId` | 수강생 쿠키 | `200 { data: ReportData \| null }` — **본인 리포트만** | RLS | Must | ⬜ |
| SSP-API-002 | `POST /api/ai/report` | `{ sessionId }` | `200 { data: ReportData }` — AI 호출 + 저장 | — | Must | ⬜ |
| SSP-API-003 | 응답 0건에서 생성 시도 | 아직 퀴즈 안 풀음 | `400` 또는 빈 리포트 — 정책 확인 | Should | ⬜ |
| SSP-API-004 | AI 응답 Zod 검증 | `understanding_summary`, `weak_topics`, `recommendations` 필드 검증 | 스키마 위반 시 `500` + 재시도 1회 | Must | ⬜ |
| SSP-API-005 | 타 수강생 리포트 격리 | A가 B의 `sessionId`로 조회 | 본인 응답 기반으로만 생성/조회 | Must | ⬜ |
| SSP-API-006 | 중복 생성 | 이미 리포트 존재 상태에서 POST | 덮어쓰기 또는 새 레코드 (정책 확인) | Should | ⬜ |

---

## 3. Realtime

N/A

---

## 4. 에러 / 엣지

| TC ID | 시나리오 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|---------|------|
| SSP-ERR-001 | AI 생성 실패 | Gemini 에러 | 로딩 해제, 에러 메시지 없음 (silent) — **에러 토스트 추가 필요** | Should | ⬜ |
| SSP-ERR-002 | 미참여 세션 리포트 조회 | — | 빈 상태 "아직 리포트가 생성되지 않았습니다" | Should | ⬜ |
| SSP-ERR-003 | `understanding_summary` null | — | 레이더 차트 카드 숨김 | Should | ⬜ |
| SSP-ERR-004 | 토픽명에 특수문자 | `"C++"` 등 | 차트 레이블 정상 렌더 | Could | ⬜ |
| SSP-ERR-005 | 토픽 12개 이상 | 차트 축 과밀 | 레이블 겹침 가능성 — 스크롤/축소 고려 | Could | ⬜ |
| SSP-ERR-006 | 네트워크 끊김 중 생성 | — | 로딩 해제, 기존 state 유지 | Should | ⬜ |

---

## 5. 경계값 테스트

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| SSP-BND-001 | 레이더 토픽 정확히 1개 | `understanding_summary` = `{ "Java": 80 }` | 진입 | RadarChart 렌더 불가 (최소 3축) 또는 단일 축 처리 — 차트 라이브러리 동작 확인 | Must | ⬜ |
| SSP-BND-002 | 레이더 토픽 정확히 2개 | 2개 토픽 | 진입 | RadarChart 최소 폴리곤 미형성 가능성 — fallback 처리 확인 | Must | ⬜ |
| SSP-BND-003 | 레이더 토픽 정확히 3개 (최소 유효) | 3개 토픽 | 진입 | RadarChart 정삼각형 모양으로 정상 렌더 | Should | ⬜ |
| SSP-BND-004 | 토픽 이해도 0점 | `{ "네트워크": 0 }` | — | 레이더 차트 0점 꼭짓점 표시, NaN 없음 | Should | ⬜ |
| SSP-BND-005 | 토픽 이해도 100점 | `{ "Java": 100 }` | — | 꼭짓점이 최외곽에 위치 | Should | ⬜ |
| SSP-BND-006 | `weak_topics` 1개 | — | — | destructive 배지 1개 + 안내문 표시 | Should | ⬜ |
| SSP-BND-007 | `weak_topics` 10개 이상 | — | — | 배지 리스트 가로 스크롤 또는 줄바꿈, 레이아웃 깨짐 없음 | Could | ⬜ |
| SSP-BND-008 | `recommendations` 빈 문자열 | `""` | — | 추천 카드 미노출 또는 빈 박스 (공백 처리) | Should | ⬜ |
| SSP-BND-009 | `recommendations` 3000자 이상 | 매우 긴 AI 응답 | — | whitespace-pre-wrap으로 스크롤 가능, 레이아웃 넘침 없음 | Could | ⬜ |
| SSP-BND-010 | `sessionId` 빈 파라미터 | `?sessionId=` | GET 요청 | `400` 또는 `200 null` — 정책 확인 | Should | ⬜ |

---

## 6. 인증 컨텍스트

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| SSP-AUTH-001 | 비인증 접근 | 쿠키 없음 | 직접 URL 접근 | `/login`으로 리다이렉트 | Must | ⬜ |
| SSP-AUTH-002 | teacher role 접근 | teacher 쿠키 | 동일 URL 접근 | `/instructor`로 리다이렉트 (student layout guard) | Must | ⬜ |
| SSP-AUTH-003 | mentor role 접근 | mentor 쿠키 | 동일 URL 접근 | `/mentor`로 리다이렉트 | Must | ⬜ |
| SSP-AUTH-004 | owner role 접근 | owner 쿠키 | 동일 URL 접근 | `/owner`로 리다이렉트 | Must | ⬜ |
| SSP-AUTH-005 | POST `/api/ai/report` — teacher 토큰 | teacher 쿠키 | POST 요청 | `403` (student 전용 엔드포인트) | Must | ⬜ |
| SSP-AUTH-006 | POST 중 세션 만료 | 생성 도중 쿠키 만료 | — | `401` 응답 → 에러 처리, 리다이렉트 또는 에러 표시 | Should | ⬜ |

---

## 7. 네트워크 에러

| TC ID | 시나리오 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|------|---------|---------|------|
| SSP-NET-001 | `GET /api/ai/report` 타임아웃 | 진입 | 로딩 상태 후 에러 — "아직 리포트가 생성되지 않았습니다" fallback | Should | ⬜ |
| SSP-NET-002 | `POST /api/ai/report` 500 | "AI 리포트 생성" 클릭 | 로딩 해제, 에러 토스트 "리포트 생성에 실패했습니다." | Should | ⬜ |
| SSP-NET-003 | Gemini API 다운 | POST 시도 | 서버가 `500` 반환 (재시도 1회 후 실패) — 에러 상태 렌더 | Should | ⬜ |
| SSP-NET-004 | AI Zod 검증 실패 — 재시도 검증 | AI 응답 스키마 위반 | 1회 재시도 → 성공 시 정상 리포트, 실패 시 `500` | Must | ⬜ |
| SSP-NET-005 | 연속 POST (더블클릭) | "AI 리포트 생성" 더블클릭 | 버튼 disabled → 두 번째 요청 차단 | Must | ⬜ |

---

## 8. AI 응답 검증

| TC ID | 시나리오 | 전제조건 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|---------|---------|------|
| SSP-AI-001 | Zod 스키마 필수 필드 누락 | AI가 `weak_topics` 미포함 | `500` + 1회 재시도 — CLAUDE.md 규칙 #14 | Must | ⬜ |
| SSP-AI-002 | `understanding_summary` 값 범위 초과 | AI가 `{ Java: 150 }` 반환 | Zod `z.number().min(0).max(100)` 검증 실패 → 재시도 | Should | ⬜ |
| SSP-AI-003 | `recommendations` 타입 오류 | AI가 배열 대신 문자열 반환 | Zod 검증 실패 → 재시도 | Should | ⬜ |
| SSP-AI-004 | AI 응답 JSON 파싱 실패 | 비정형 응답 | 1회 재시도 — CLAUDE.md 규칙 #14 | Must | ⬜ |
| SSP-AI-005 | 리포트 저장 후 DB 확인 | POST 성공 | `GET /api/ai/report`로 재조회 시 동일 데이터 반환 | Should | ⬜ |

---

## 9. 접근성

| TC ID | 시나리오 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|------|---------|---------|------|
| SSP-A11Y-001 | 키보드 탐색 | Tab 순차 이동 | "결과로 돌아가기" → "AI 리포트 생성"(있을 경우) 포커스 가능 | Should | ⬜ |
| SSP-A11Y-002 | 레이더 차트 스크린리더 | — | 차트 대체 텍스트 또는 데이터 테이블 제공 | Could | ⬜ |
| SSP-A11Y-003 | 로딩 중 ARIA | 생성 중 | `aria-busy="true"` 또는 `aria-label="리포트 생성 중"` | Could | ⬜ |
| SSP-A11Y-004 | `data-testid` 존재 | — | `[data-testid="report-radar-chart"]`, `[data-testid="weak-topics-list"]`, `[data-testid="generate-report-btn"]`, `[data-testid="recommendations-card"]` | Must | ⬜ |
| SSP-A11Y-005 | 취약 개념 배지 스크린리더 | — | `aria-label="취약 개념: {토픽명}"` | Could | ⬜ |

---

## 10. 한국어 에러 메시지

| TC ID | 시나리오 | 기대 에러 문구 | 우선순위 | 상태 |
|-------|---------|--------------|---------|------|
| SSP-KO-001 | AI 생성 실패 토스트 | "AI 리포트 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." | Should | ⬜ |
| SSP-KO-002 | 응답 0건 경고 | "퀴즈에 참여하지 않아 리포트를 생성할 수 없습니다." | Should | ⬜ |
| SSP-KO-003 | 네트워크 오류 | "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해 주세요." | Should | ⬜ |
| SSP-KO-004 | 인증 만료 리다이렉트 전 메시지 | "로그인이 만료되었습니다. 다시 로그인해 주세요." | Should | ⬜ |

---

## 11. RLS 교차 검증

| TC ID | 시나리오 | 전제조건 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|---------|---------|------|
| SSP-RLS-001 | 타 학원 수강생 — GET 리포트 | A 학원 student가 B 학원 sessionId로 GET | `200 null` 또는 `403` — 타인 리포트 미노출 | Must | ⬜ |
| SSP-RLS-002 | 타 학원 수강생 — POST 리포트 | A 학원 student가 B 학원 sessionId로 POST | `400`(세션 없음) 또는 `403` | Must | ⬜ |
| SSP-RLS-003 | 동 학원 타 수강생 리포트 격리 | 같은 학원 A, B 수강생 | A가 B의 리포트 GET 불가 (RLS `user_id` 격리) | Must | ⬜ |
| SSP-RLS-004 | 리포트 생성 — 자신의 응답만 사용 | AI 프롬프트 생성 시 | B의 응답이 A의 리포트 생성에 사용되지 않음 | Must | ⬜ |
| SSP-RLS-005 | 비인증 GET 시도 | 쿠키 없이 GET /api/ai/report | `401` 또는 `403` | Must | ⬜ |

---

## 12. XSS / SQL 인젝션

| TC ID | 시나리오 | 입력 | 기대결과 | 우선순위 | 상태 |
|-------|---------|------|---------|---------|------|
| SSP-SEC-001 | `recommendations` XSS | AI가 `<script>alert(1)</script>` 포함 응답 | React escape로 텍스트 렌더, 스크립트 실행 없음 | Must | ⬜ |
| SSP-SEC-002 | `weak_topics` XSS | `["<img onerror=alert(1)>"]` | 배지에 escape 처리 | Must | ⬜ |
| SSP-SEC-003 | `sessionId` URL 파라미터 인젝션 | `?sessionId='; DROP TABLE--` | Supabase 파라미터 바인딩 — SQL 인젝션 차단 | Must | ⬜ |
| SSP-SEC-004 | POST body `sessionId` 조작 | `{ "sessionId": "'; SELECT *--" }` | Zod UUID 검증 실패 → `400` | Must | ⬜ |

---

## 13. 레이트 리밋 / 중복 방지

| TC ID | 시나리오 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|------|---------|---------|------|
| SSP-RL-001 | 리포트 생성 버튼 더블클릭 | 클릭 2회 연속 | 두 번째 클릭 무시 (버튼 disabled) — AI API 중복 호출 방지 | Must | ⬜ |
| SSP-RL-002 | 생성 중 페이지 새로고침 | 생성 중 F5 | 페이지 재로드 후 상태 초기화 — 중복 요청 없음 | Should | ⬜ |
| SSP-RL-003 | 짧은 시간 내 반복 POST | 5초 내 3회 시도 | 서버 측 또는 클라이언트 측 중복 방지 확인 | Could | ⬜ |

---

## 14. 브라우저 네비게이션 복구

| TC ID | 시나리오 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|------|---------|---------|------|
| SSP-NAV-001 | 결과 → 리포트 → 뒤로가기 | 브라우저 뒤로 | 결과 화면 재렌더 — 데이터 유지 | Should | ⬜ |
| SSP-NAV-002 | 리포트 새로고침 | F5 | 기존 리포트 있으면 바로 렌더, 없으면 CTA 표시 | Must | ⬜ |
| SSP-NAV-003 | 리포트 생성 중 뒤로가기 | POST 중 브라우저 뒤로 | 요청 취소 — 부분 저장 없음 확인 | Should | ⬜ |
| SSP-NAV-004 | 탭 전환 후 복귀 | 다른 탭 30분 후 복귀 | 쿠키 유효 시 정상, 만료 시 `/login` | Should | ⬜ |
| SSP-NAV-005 | URL 직접 입력 — 다른 sessionId | 다른 세션 report URL 입력 | 해당 세션 리포트 로드 (본인 소유인 경우만) | Should | ⬜ |
