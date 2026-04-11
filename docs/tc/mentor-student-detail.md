# TC — 멘토 학생 상담 상세

| 항목 | 값 |
|------|---|
| 라우트 | `/mentor/students/[id]` |
| 파일 | `src/app/mentor/students/[id]/page.tsx` (482 lines) |
| 역할 | 멘토 |
| 관련 기능 | F5 AI 코칭 + F6 피드백 — 개인 상담 뷰 |
| 주요 API | `GET /api/mentor/students/[id]`, `GET /api/mentor/consultations?studentId`, `POST /api/mentor/consultations`, `POST /api/ai/mentor-briefing` |
| Realtime 채널 | N/A |

> 수강생 개별 페이지: 위험도 카드 + 3-신호 상세 + AI 브리핑(선택) + 세션 정답률 추이 + 토픽 레이더 + 취약 토픽 + 상담 기록 CRUD (다이얼로그).

---

## 1. UI 시나리오

### 1-1. 위험도 헤더 & 3-신호

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| MSD-UI-001 | HIGH 수강생 로드 | `risk_level=HIGH` | 진입 | 빨간 테두리 카드, "이탈 위험" 배지, 큰 아바타 이니셜 | Must | ⬜ |
| MSD-UI-002 | 3-신호 그리드 | — | — | 정답률·응답속도·연속미참여 3개 카드 (신호 해당 시 빨강 배경) | Must | ⬜ |
| MSD-UI-003 | 목록으로 돌아가기 | — | "목록으로" 링크 | `/mentor`로 이동 | Should | ⬜ |
| MSD-UI-004 | LOW 수강생 로드 | `risk_level=LOW` | 진입 | 초록 테두리 + "양호" 배지, 3-신호 모두 초록 배경 | Should | ⬜ |

### 1-2. AI 상담 브리핑

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| MSD-UI-010 | 브리핑 생성 정상 | — | "AI 상담 브리핑" 클릭 | 로딩 → 보라색 카드에 `talking_points` (번호 리스트) + `weakness_analysis` + `recommended_strategy` + (옵션) `recommended_courses` | Must | ⬜ |
| MSD-UI-011 | 브리핑 초기 숨김 | 미클릭 | — | 브리핑 카드 미노출 | Should | ⬜ |
| MSD-UI-012 | 브리핑 로딩 상태 | 생성 중 | — | 버튼 "브리핑 생성중..." + Spinner + `disabled` | Should | ⬜ |
| MSD-UI-013 | 추천 강의 없음 | `recommended_courses` null/빈 배열 | — | 추천 강의 섹션 미노출 | Should | ⬜ |

### 1-3. 차트 (정답률 추이 + 토픽 레이더)

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| MSD-UI-020 | 세션 추이 차트 | `session_history.length ≥ 1` | — | `LineChart` 0-100 스케일, `세션1..N` X축 | Must | ⬜ |
| MSD-UI-021 | 세션 추이 — 빈 상태 | 세션 기록 0 | — | "데이터가 없습니다" 텍스트 | Should | ⬜ |
| MSD-UI-022 | 토픽 레이더 | `weak_topics.length ≥ 1` | — | `RadarChart` 0-100 스케일 | Must | ⬜ |
| MSD-UI-023 | 레이더 — 빈 상태 | — | — | 동일 빈 상태 텍스트 | Should | ⬜ |
| MSD-UI-024 | 취약 토픽 카드 | `weak_topics.length > 0` | — | 토픽명 + 정답률 (<40 빨강, 40-60 노랑, ≥60 초록) | Must | ⬜ |
| MSD-UI-025 | 취약 토픽 0개 | — | — | 취약 토픽 카드 미노출 | Should | ⬜ |

### 1-4. 상담 기록 CRUD

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| MSD-UI-030 | 상담 기록 리스트 | `consultations ≥ 1` | — | 타임라인 (왼쪽 테두리 + 유형 배지 + 내용 + 다음 상담 예정일) | Must | ⬜ |
| MSD-UI-031 | 빈 상태 | 기록 0 | — | "아직 상담 기록이 없습니다" | Must | ⬜ |
| MSD-UI-032 | 기록 추가 다이얼로그 | — | "기록 추가" 클릭 | `Dialog` 오픈, 유형(학습부진/진로/출결/기타) Select + 내용 Textarea + 다음 예정일 Date 입력 | Must | ⬜ |
| MSD-UI-033 | 기록 저장 정상 | 다이얼로그 열림 | 유형 선택 + 내용 입력 + 저장 | 다이얼로그 닫힘 + 리스트 최상단에 새 기록 추가 | Must | ⬜ |
| MSD-UI-034 | 내용 공란 저장 차단 | — | 내용 공란 | "저장" `disabled` | Must | ⬜ |
| MSD-UI-035 | 저장 중 로딩 | — | — | 버튼 "저장 중..." + `disabled` | Should | ⬜ |
| MSD-UI-036 | 다이얼로그 취소 | 편집 중 | "취소" 클릭 | 다이얼로그 닫힘, 입력 폐기 (재오픈 시 공란) | Should | ⬜ |
| MSD-UI-037 | 다음 상담일 표시 | `next_consultation_date` 존재 | — | 파란색 "다음 상담: YYYY. M. D." 텍스트 | Should | ⬜ |
| MSD-UI-038 | 상담 유형 배지 | — | — | 한국어 라벨 (`TYPE_LABELS`) | Should | ⬜ |

---

## 2. API 계약

| TC ID | 엔드포인트 | 요청 | 기대응답 | RLS/인가 | 우선순위 | 상태 |
|-------|-----------|------|---------|---------|---------|------|
| MSD-API-001 | `GET /api/mentor/students/[id]` | — | `200 { data: StudentDetail }` (risk + history + weak_topics) | 본인 학원 수강생만 | Must | ⬜ |
| MSD-API-002 | `GET /api/mentor/consultations?studentId` | — | `200 { data: ConsultationNote[] }` | 본인이 작성한 기록만 (또는 학원 공유 정책 확인) | Must | ⬜ |
| MSD-API-003 | `POST /api/mentor/consultations` | `{ studentId, type, content, nextConsultationDate? }` | `201 { data: ConsultationNote }` | — | Must | ⬜ |
| MSD-API-004 | `POST /api/ai/mentor-briefing` | `{ studentId }` | `200 { data: MentorBriefing }` (talking_points, weakness_analysis, recommended_strategy, recommended_courses?) | — | Must | ⬜ |
| MSD-API-005 | 브리핑 Zod 검증 | AI 응답 | `talking_points: string[]` 필수, 스키마 위반 시 `500` + 재시도 1회 | — | Must | ⬜ |
| MSD-API-006 | `type` enum 검증 | `{ type: "invalid" }` | `400` Zod | — | Should | ⬜ |
| MSD-API-007 | `content` 빈값 | `{ content: "" }` | `400` | — | Must | ⬜ |
| MSD-API-008 | `nextConsultationDate` 미래 날짜 | `"2027-01-01"` | 정상 저장 | — | Should | ⬜ |
| MSD-API-009 | `nextConsultationDate` 과거 날짜 | `"2020-01-01"` | 허용 또는 경고 — 정책 확인 | Could | ⬜ |

---

## 3. Realtime

N/A — 1회 fetch. 다른 멘토의 상담 기록 실시간 반영은 없음.

---

## 4. 에러 / 엣지

| TC ID | 시나리오 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|---------|------|
| MSD-ERR-001 | **타 학원 수강생 접근 차단** | A 학원 멘토가 B 학원 `studentId` URL 직접 접근 | RLS로 차단, `404` 또는 빈 상태 (커밋 `b081bed` 회귀) | Must | ⬜ |
| MSD-ERR-002 | 존재하지 않는 studentId | — | 빈 상태 또는 404 | Should | ⬜ |
| MSD-ERR-003 | 브리핑 AI 실패 | Gemini 에러 | 로딩 해제, 브리핑 카드 미노출 (silent) — **에러 토스트 권장** | Should | ⬜ |
| MSD-ERR-004 | 상담 기록 저장 실패 | 500 | 다이얼로그 유지, 에러 표시 필요 (현재 silent) | Should | ⬜ |
| MSD-ERR-005 | 레이더 차트 토픽 1개 | — | RadarChart 렌더 가능 여부 확인 (최소 3각이어야 레이더가 의미 있음) | Could | ⬜ |
| MSD-ERR-006 | `weak_topics.accuracy` null | — | 색상 로직 fallback 필요 | Should | ⬜ |
| MSD-ERR-007 | 브리핑 `talking_points = []` | — | 빈 `<ol>` 렌더, 크래시 없음 | Should | ⬜ |
| MSD-ERR-008 | 상담 기록 XSS (`content = "<script>"`) | — | React escape로 안전 | Should | ⬜ |
| MSD-ERR-009 | 다이얼로그 ESC 키 | — | 다이얼로그 닫힘 (shadcn Dialog 기본 동작) | Could | ⬜ |
| MSD-ERR-010 | 멘토 role 없이 접근 | home/login에 mentor 분기 없음 (memory) | 레이아웃 가드로 `/login` 리다이렉트 필요 — **회귀 리스크** | Must | ⬜ |

---

## 5. 경계값 테스트

### 5-1. 3-신호 임계값

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| MSD-BND-001 | `recent_accuracy` = 임계값 정확히 | `ACCURACY_THRESHOLD` 경계 (예: 60%) | 3-신호 그리드 | `low_accuracy` 신호 ON/OFF 경계 확인 | Must | ⬜ |
| MSD-BND-002 | `recent_accuracy` = 0 | — | 3-신호 그리드 | `low_accuracy = true`, 빨간 배경 | Must | ⬜ |
| MSD-BND-003 | `recent_accuracy` = 100 | — | — | `low_accuracy = false`, 초록 배경 | Must | ⬜ |
| MSD-BND-004 | `speed_increase` = `RISK_SPEED_INCREASE_RATIO` 경계 (1.3x) | 평균 대비 1.3배 속도 | — | `speed_increase = true` 경계 확인 — 상수 `RISK_SPEED_INCREASE_RATIO` 기반 | Must | ⬜ |
| MSD-BND-005 | `consecutive_absences` = ABSENCE_THRESHOLD 경계 | — | — | 임계값 이상 시 `absence = true` 확인 | Must | ⬜ |
| MSD-BND-006 | `consecutive_absences` = 0 | — | — | 결석 신호 OFF, 초록 배경 | Should | ⬜ |

### 5-2. 차트 경계값

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| MSD-BND-010 | 세션 추이 1개 세션 | `session_history.length = 1` | LineChart | 점 1개만 표시 (선 없음) 또는 단일 점 렌더 — 크래시 없음 | Should | ⬜ |
| MSD-BND-011 | 세션 추이 20개 세션 | `session_history.length = 20` | LineChart | X축 레이블 과밀 처리, 가로 스크롤 또는 틱 간격 조정 | Could | ⬜ |
| MSD-BND-012 | 레이더 토픽 1개 | `weak_topics = [{ topic: "Java", accuracy: 30 }]` | RadarChart | 렌더 가능 여부 — fallback 텍스트 또는 단일 데이터 처리 | Must | ⬜ |
| MSD-BND-013 | 레이더 토픽 2개 | — | RadarChart | 최소 폴리곤 미형성 가능성 확인 | Must | ⬜ |
| MSD-BND-014 | 레이더 토픽 3개 (최소 유효) | — | RadarChart | 정삼각형 레이더 정상 렌더 | Should | ⬜ |
| MSD-BND-015 | 취약 토픽 accuracy 정확히 40% | `accuracy = 40` | 취약 토픽 카드 | 노랑 (`40-60` 구간) — 경계값 `<40` vs `≤40` 확인 | Should | ⬜ |
| MSD-BND-016 | 취약 토픽 accuracy 정확히 60% | `accuracy = 60` | 취약 토픽 카드 | 초록 (`≥60` 구간) — 경계값 확인 | Should | ⬜ |

### 5-3. 상담 기록 경계값

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| MSD-BND-020 | `content` 1글자 입력 | — | 저장 버튼 활성화 | `content.length ≥ 1` 이면 저장 활성화 | Should | ⬜ |
| MSD-BND-021 | `content` 최대 길이 | 5000자 입력 | POST | 저장 성공 또는 Zod 길이 제한 초과 `400` | Should | ⬜ |
| MSD-BND-022 | 상담 기록 50개 이상 | — | 리스트 | 모든 기록 렌더 또는 페이지네이션, 스크롤 가능 | Could | ⬜ |
| MSD-BND-023 | `nextConsultationDate` 오늘 날짜 | 오늘 Date 입력 | POST | 정상 저장 | Should | ⬜ |

---

## 6. 인증 컨텍스트

| TC ID | 시나리오 | 전제조건 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|------|---------|---------|------|
| MSD-AUTH-001 | 비인증 접근 | 쿠키 없음 | 직접 URL 접근 | `/login`으로 리다이렉트 | Must | ⬜ |
| MSD-AUTH-002 | teacher role 접근 | teacher 쿠키 | 동일 URL 접근 | `/instructor`로 리다이렉트 (mentor layout guard) | Must | ⬜ |
| MSD-AUTH-003 | student role 접근 | student 쿠키 | 동일 URL 접근 | `/student` 또는 `/login`으로 리다이렉트 | Must | ⬜ |
| MSD-AUTH-004 | owner role 접근 | owner 쿠키 | 동일 URL 접근 | `/owner`로 리다이렉트 | Must | ⬜ |
| MSD-AUTH-005 | `GET /api/mentor/students/[id]` — teacher 토큰 | teacher 쿠키 | API 직접 호출 | `403` | Must | ⬜ |
| MSD-AUTH-006 | `POST /api/mentor/consultations` — student 토큰 | student 쿠키 | API 직접 호출 | `403` | Must | ⬜ |
| MSD-AUTH-007 | `POST /api/ai/mentor-briefing` — teacher 토큰 | teacher 쿠키 | API 직접 호출 | `403` (mentor 전용) | Must | ⬜ |
| MSD-AUTH-008 | 세션 만료 후 저장 시도 | 쿠키 만료 | "저장" 클릭 | `401` 응답 → 에러 처리 또는 `/login` 리다이렉트 | Should | ⬜ |
| MSD-AUTH-009 | 브리핑 생성 중 세션 만료 | POST 중 쿠키 만료 | — | `401` → 에러 상태, 리다이렉트 또는 에러 표시 | Should | ⬜ |

---

## 7. 네트워크 에러

| TC ID | 시나리오 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|------|---------|---------|------|
| MSD-NET-001 | `GET /api/mentor/students/[id]` 타임아웃 | 진입 | 로딩 후 에러 — 빈 상태 또는 에러 안내 | Should | ⬜ |
| MSD-NET-002 | `GET /api/mentor/students/[id]` 500 | 진입 | 에러 바운더리 또는 에러 토스트, 크래시 없음 | Should | ⬜ |
| MSD-NET-003 | `GET /api/mentor/consultations` 실패 | 진입 | 상담 기록 빈 상태 (silent 또는 에러 토스트) | Should | ⬜ |
| MSD-NET-004 | `POST /api/mentor/consultations` 500 | 저장 클릭 | 다이얼로그 유지, 에러 토스트 "저장에 실패했습니다." | Should | ⬜ |
| MSD-NET-005 | `POST /api/ai/mentor-briefing` 실패 | 브리핑 클릭 | 로딩 해제, 에러 토스트 또는 silent, 버튼 재활성화 | Should | ⬜ |
| MSD-NET-006 | Gemini API 다운 | 브리핑 생성 시도 | 서버 `500` (재시도 1회) → 에러 상태 | Should | ⬜ |
| MSD-NET-007 | 오프라인 상태 진입 | 진입 | 에러 바운더리 또는 네트워크 오류 안내 | Should | ⬜ |

---

## 8. AI 응답 검증

| TC ID | 시나리오 | 전제조건 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|---------|---------|------|
| MSD-AI-001 | `talking_points` 누락 | AI 응답에 필드 없음 | Zod 검증 실패 → 재시도 1회 — CLAUDE.md 규칙 #14 | Must | ⬜ |
| MSD-AI-002 | `talking_points = []` | AI가 빈 배열 반환 | Zod 통과 → 빈 `<ol>` 렌더, 크래시 없음 | Should | ⬜ |
| MSD-AI-003 | `recommended_courses` 타입 오류 | 배열 대신 문자열 | Zod 검증 실패 → 재시도 | Should | ⬜ |
| MSD-AI-004 | JSON 파싱 실패 | 비정형 AI 응답 | 1회 재시도 후 실패 시 `500` | Must | ⬜ |
| MSD-AI-005 | `weakness_analysis` 매우 긴 텍스트 | 3000자 이상 | whitespace-pre-wrap 렌더, 레이아웃 넘침 없음 | Could | ⬜ |
| MSD-AI-006 | 브리핑 더블클릭 방지 | 버튼 두 번 클릭 | 두 번째 클릭 무시 (`disabled` 상태) — AI API 중복 호출 방지 | Must | ⬜ |

---

## 9. 접근성

| TC ID | 시나리오 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|------|---------|---------|------|
| MSD-A11Y-001 | 키보드 탭 이동 — 헤더 | Tab 키 | "목록으로" → 위험도 배지 → 3-신호 순서 포커스 | Should | ⬜ |
| MSD-A11Y-002 | 키보드 — 브리핑 버튼 | Tab → Enter | "AI 상담 브리핑" 버튼 활성화 | Must | ⬜ |
| MSD-A11Y-003 | 키보드 — 기록 추가 다이얼로그 | "기록 추가" 버튼 Enter | Dialog 오픈 | Must | ⬜ |
| MSD-A11Y-004 | ESC로 다이얼로그 닫기 | 다이얼로그 열림 후 ESC | 다이얼로그 닫힘 (shadcn 기본) | Should | ⬜ |
| MSD-A11Y-005 | 다이얼로그 포커스 트랩 | 다이얼로그 열림 중 Tab | 다이얼로그 내에서만 포커스 순환 | Should | ⬜ |
| MSD-A11Y-006 | 색 외 위험도 구분 | 색맹 사용자 | HIGH/MEDIUM/LOW가 텍스트("이탈 위험/주의/양호")로도 구분 | Should | ⬜ |
| MSD-A11Y-007 | 차트 스크린리더 | — | `aria-label` 또는 데이터 테이블 대체 제공 (LineChart, RadarChart) | Could | ⬜ |
| MSD-A11Y-008 | `data-testid` — 헤더 | — | `[data-testid="student-detail-header"]`, `[data-testid="risk-badge"]`, `[data-testid="signal-grid"]` | Must | ⬜ |
| MSD-A11Y-009 | `data-testid` — 브리핑 | — | `[data-testid="briefing-btn"]`, `[data-testid="briefing-card"]`, `[data-testid="talking-points"]` | Must | ⬜ |
| MSD-A11Y-010 | `data-testid` — 차트 | — | `[data-testid="session-trend-chart"]`, `[data-testid="radar-chart"]`, `[data-testid="weak-topics-card"]` | Must | ⬜ |
| MSD-A11Y-011 | `data-testid` — CRUD | — | `[data-testid="consultation-list"]`, `[data-testid="add-consultation-btn"]`, `[data-testid="consultation-dialog"]`, `[data-testid="save-consultation-btn"]` | Must | ⬜ |
| MSD-A11Y-012 | 로딩 중 ARIA | 브리핑/저장 중 | `aria-busy="true"` 또는 `aria-label="처리 중"` | Could | ⬜ |

---

## 10. 한국어 에러 메시지

| TC ID | 시나리오 | 기대 에러 문구 | 우선순위 | 상태 |
|-------|---------|--------------|---------|------|
| MSD-KO-001 | 학생 데이터 로드 실패 | "수강생 정보를 불러오는 중 오류가 발생했습니다." | Should | ⬜ |
| MSD-KO-002 | 브리핑 생성 실패 | "AI 브리핑 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." | Should | ⬜ |
| MSD-KO-003 | 상담 기록 저장 실패 | "상담 기록 저장에 실패했습니다." | Should | ⬜ |
| MSD-KO-004 | 권한 없음 | "멘토 권한이 필요합니다." | Must | ⬜ |
| MSD-KO-005 | 네트워크 오류 | "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해 주세요." | Should | ⬜ |
| MSD-KO-006 | 상담 내용 빈값 검증 | "상담 내용을 입력해 주세요." (클라이언트 측 버튼 disabled만이 아닌 경우) | Should | ⬜ |

---

## 11. RLS 교차 검증

| TC ID | 시나리오 | 전제조건 | 기대결과 | 우선순위 | 상태 |
|-------|---------|---------|---------|---------|------|
| MSD-RLS-001 | 타 학원 수강생 상세 접근 차단 | A 학원 mentor가 B 학원 `studentId`로 GET /api/mentor/students/[id] | `200 null` 또는 `404` — 커밋 `b081bed` 회귀 방지 | Must | ⬜ |
| MSD-RLS-002 | 타 학원 수강생 상담 기록 조회 차단 | A 학원 mentor가 B 학원 학생 GET /api/mentor/consultations?studentId | `200 []` 빈 배열 (RLS 격리) | Must | ⬜ |
| MSD-RLS-003 | 타 학원 수강생 상담 기록 생성 차단 | A 학원 mentor가 B 학원 학생 POST /api/mentor/consultations | `400` 또는 `403` | Must | ⬜ |
| MSD-RLS-004 | 타 학원 수강생 브리핑 생성 차단 | A 학원 mentor가 B 학원 학생 POST /api/ai/mentor-briefing | `400` 또는 `403` (RLS 격리) | Must | ⬜ |
| MSD-RLS-005 | 동 학원 타 멘토 상담 기록 격리 | 같은 학원 멘토 A, B | A가 B의 상담 기록 GET — 정책 확인 (개인 vs 학원 공유) | Must | ⬜ |
| MSD-RLS-006 | `consultation_notes` RLS — mentor INSERT | mentor role로 INSERT | migration 00007에서 복원된 role 체크 정상 작동 | Must | ⬜ |
| MSD-RLS-007 | `consultation_notes` RLS — student SELECT 차단 | student 쿠키로 GET /api/mentor/consultations | `403` (student는 자신의 상담 기록 조회 불가) | Must | ⬜ |
| MSD-RLS-008 | `profiles` SELECT — 타 학원 mentor | mentor가 타 학원 student profiles 접근 | RLS `academy_id` 격리로 차단 | Must | ⬜ |

---

## 12. XSS / SQL 인젝션

| TC ID | 시나리오 | 입력 | 기대결과 | 우선순위 | 상태 |
|-------|---------|------|---------|---------|------|
| MSD-SEC-001 | `content` XSS — 상담 기록 | `<script>alert(1)</script>` | React escape로 텍스트 렌더, 스크립트 실행 없음 | Must | ⬜ |
| MSD-SEC-002 | `content` HTML 인젝션 | `<img src=x onerror=alert(1)>` | escape 처리, 이벤트 실행 없음 | Must | ⬜ |
| MSD-SEC-003 | `studentId` URL 파라미터 인젝션 | `'; DROP TABLE--` | Supabase 파라미터 바인딩 — SQL 인젝션 차단 | Must | ⬜ |
| MSD-SEC-004 | POST body `studentId` 조작 | `{ "studentId": "'; SELECT *--" }` | Zod UUID 검증 실패 → `400` | Must | ⬜ |
| MSD-SEC-005 | `talking_points` XSS | AI 응답에 `<script>` 포함 | React escape로 `<ol>` 렌더, 스크립트 실행 없음 | Must | ⬜ |
| MSD-SEC-006 | `display_name` XSS | DB에 `<img onerror=...>` | 아바타 이니셜에 escape 처리 | Must | ⬜ |
| MSD-SEC-007 | `content` SQL 인젝션 | `'; INSERT INTO profiles--` | Supabase 파라미터 바인딩으로 차단 | Must | ⬜ |

---

## 13. 레이트 리밋 / 중복 방지

| TC ID | 시나리오 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|------|---------|---------|------|
| MSD-RL-001 | 브리핑 버튼 더블클릭 | 두 번 연속 클릭 | 버튼 즉시 disabled → 두 번째 클릭 무시, AI API 중복 호출 방지 | Must | ⬜ |
| MSD-RL-002 | 저장 버튼 더블클릭 | 두 번 연속 클릭 | 버튼 "저장 중..." + disabled → 중복 POST 방지 | Must | ⬜ |
| MSD-RL-003 | 브리핑 후 즉시 재생성 | 브리핑 완료 후 버튼 재클릭 | 새 브리핑 생성 가능 (현재 캐시 없음) 또는 캐시 반환 — 정책 확인 | Should | ⬜ |
| MSD-RL-004 | 짧은 시간 내 다수 상담 기록 저장 | 연속 3개 저장 | 각 요청 독립 처리, 순서 보장 확인 | Could | ⬜ |

---

## 14. 브라우저 네비게이션 복구

| TC ID | 시나리오 | 단계 | 기대결과 | 우선순위 | 상태 |
|-------|---------|------|---------|---------|------|
| MSD-NAV-001 | 목록 → 상세 → 뒤로가기 | 목록에서 카드 클릭 후 "목록으로" | 대시보드 재렌더, 스크롤 위치 상단 | Should | ⬜ |
| MSD-NAV-002 | 상세 페이지 새로고침 | F5 | 데이터 재페칭, 브리핑은 초기화 (미저장 상태) | Must | ⬜ |
| MSD-NAV-003 | 브리핑 생성 중 새로고침 | POST 중 F5 | 페이지 재로드 — 브리핑 요청 취소, 초기 상태 | Should | ⬜ |
| MSD-NAV-004 | 저장 중 브라우저 뒤로가기 | POST 중 뒤로 | 저장 중단 — 부분 저장 없음 확인 (또는 저장 완료 후 이동) | Should | ⬜ |
| MSD-NAV-005 | 다이얼로그 열린 상태에서 뒤로가기 | Dialog 열린 채 뒤로 | Dialog 닫힘 또는 페이지 이동 — UX 정책 확인 | Should | ⬜ |
| MSD-NAV-006 | URL 직접 입력 — 다른 studentId | 다른 학생 URL 입력 | 해당 학생 데이터 로드 (본인 학원 소속인 경우만) | Should | ⬜ |
| MSD-NAV-007 | 탭 전환 후 복귀 — 브리핑 상태 | 브리핑 생성 후 다른 탭 갔다 복귀 | 브리핑 결과 유지 (클라이언트 state) | Should | ⬜ |
| MSD-NAV-008 | 오래된 탭 복귀 후 저장 시도 | 30분 후 복귀 + 저장 클릭 | `401` 응답 → 에러 처리 | Should | ⬜ |
