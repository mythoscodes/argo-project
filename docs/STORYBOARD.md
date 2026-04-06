# Argos — 프론트엔드 스토리보드

> 팀 mythos | 2026 KIT 바이브코딩 공모전  
> 스택: Next.js 14 App Router · Tailwind CSS · shadcn/ui · Recharts

---

## 1. 공통

### 로그인 (`/login`)
화면 목적: Supabase Auth 기반 이메일 로그인 + 역할(강사/수강생/원장) 분기

- Card: 로그인 폼 (이메일 · 비밀번호)
- Button: 로그인
- 로그인 후 role → `/instructor` / `/student/join` / `/owner` 자동 리다이렉트

흐름: `진입` → 로그인 → 역할 분기

---

## 2. 강사 뷰

### 세션 목록 (`/instructor`)
화면 목적: 내 수업 세션 전체 조회 및 신규 생성 진입

- DataTable: 세션 목록 (제목, 과목, 상태, 참여자 수, 날짜)
- Badge: 상태 (대기중 / 진행중 / 종료)
- Button: 새 세션 만들기

```
GET /api/sessions
```

흐름: 로그인 → **세션 목록** → 세션 생성 or 세션 클릭

---

### 세션 생성 (`/instructor/sessions/new`)
화면 목적: 수업 세션 정보 입력 및 AI 퀴즈를 위한 주제 태깅

- Form: 수업 제목, 과목(select), 과정 카테고리(Spring/React/Python/보안/네트워크)
- TagInput: 오늘 수업 주제 태그 (예: `JPA`, `N+1`)
- Toggle: 익명 모드
- Button: 세션 생성 → 참여 코드 발급

```
POST /api/sessions
```

흐름: 세션 목록 → **세션 생성** → 수업 대시보드

---

### 수업 대시보드 🔴 LIVE (`/instructor/sessions/[id]`)
화면 목적: 수업 중 실시간 이해도 모니터링 + AI 퀴즈 발송 + AI 코칭 수신 (핵심 화면)

#### 레이아웃 (4개 패널)

**① 참여자 현황 패널 (좌상)**
- 참여 코드 Badge (대형, 복사 버튼)
- Avatar 그룹: 입장한 수강생 수 / 총원
- 실시간 구독: `session_participants` INSERT

**② 퀴즈 생성 패널 (우상)**
- Button: AI 퀴즈 생성 (로딩 스피너 포함)
- QuizCard: 생성된 문제 미리보기 (문제, 코드 스니펫, 보기 4개)
- Button: 퀴즈 발송 / 재생성

```
POST /api/ai/quiz       (퀴즈 생성)
POST /api/quizzes       (DB 저장 + 발송)
```

**③ 실시간 히트맵 패널 (좌하) 🔴 LIVE**
- Recharts Heatmap: 주제별 × 수강생별 이해도 격자 (녹색=이해 / 빨강=미이해 / 회색=미응답)
- 응답 진행률 ProgressBar (x/N명 응답)
- 실시간 구독: `responses` INSERT

```
GET /api/ai/analysis?session_id={id}
```

**④ AI 코칭 패널 (우하) 🔴 LIVE**
- Alert 카드: AI 코칭 메시지 (아이콘 + 텍스트)
- Button: 지금 분석하기
- 이전 코칭 히스토리 Accordion
- 실시간 구독: `analysis_results` INSERT

```
POST /api/ai/analysis    (이해도 분석)
POST /api/ai/coaching    (코칭 생성)
```

**⑤ 피드백 루프 섹션 (F6)**
- 이전 라운드 vs 현재 라운드 이해도 델타 BarChart (Recharts)
- Button: 재퀴즈 발송 (round_number + 1)
- 개선율 Badge (예: +23%)

흐름: 세션 생성 → **수업 대시보드** → 수업 종료 → 리포트 목록  
모바일 대응: 패널을 탭(Tab)으로 전환하는 모바일 레이아웃  
실시간: `session_participants` · `responses` · `analysis_results` 구독

---

### 리포트 목록 (`/instructor/sessions/[id]/reports`)
화면 목적: 수업 종료 후 생성된 AI 분석 리포트 열람

- Card: 리포트 유형 (이해도 분석 / 강사 코칭 요약 / 수강생별 요약)
- Recharts LineChart: 라운드별 평균 이해도 추이
- Button: AI 리포트 생성

```
GET  /api/sessions/[id]
POST /api/ai/report
```

흐름: 수업 대시보드 → **리포트 목록** → (완료)

---

## 3. 수강생 뷰

> 모든 화면 모바일 최적화 (세로 스크롤, 터치 친화적 버튼)

### 세션 참여 (`/student/join`)
화면 목적: 참여 코드 입력으로 수업 세션 접속

- Input: 참여 코드 (숫자 6자리, 대형 폰트)
- Button: 참여하기

```
POST /api/sessions/join
```

흐름: 진입 → 참여 코드 입력 → **퀴즈 응답** 화면

---

### 퀴즈 응답 🔴 LIVE (`/student/sessions/[id]`)
화면 목적: 강사가 발송한 퀴즈에 실시간 응답 (모바일 핵심 화면)

- QuizCard: 문제 텍스트 + 코드 스니펫(SyntaxHighlighter)
- RadioGroup: 보기 A/B/C/D (큼직한 터치 영역)
- Button: 제출
- 대기 상태: "강사가 다음 퀴즈를 준비 중입니다..." 스피너
- 실시간 구독: `quizzes` INSERT (새 퀴즈 자동 수신)

```
POST /api/responses
```

흐름: 세션 참여 → **퀴즈 응답** → 결과 확인

---

### 결과 확인 (`/student/sessions/[id]/result`)
화면 목적: 내 응답 결과 및 정답 확인

- ResultCard: 정답 여부 (아이콘 + 색상), 정답 해설
- 점수 Badge: 라운드별 맞은 개수
- Button: 다음 퀴즈 대기 (자동)

```
GET /api/responses?session_id={id}&student_id={me}
```

흐름: 퀴즈 응답 → **결과 확인** → 퀴즈 응답 (다음 라운드) or 학습 리포트

---

### 학습 리포트 (`/student/sessions/[id]/report`)
화면 목적: 수업 후 본인 이해도 요약 및 학습 경로 추천 (F7)

- Recharts RadarChart: 개념별 이해도 (5각형)
- WeakTopicList: 취약 개념 목록 + AI 추천 학습 링크
- RecommendationCard: AI 작성 개인화 코멘트

```
GET  /api/ai/report?session_id={id}&student_id={me}
```

흐름: 결과 확인 → **학습 리포트** → (완료)

---

## 4. 원장 뷰 (F8 — P2 보너스)

### 경영 대시보드 (`/owner`)
화면 목적: 학원 전체 수업 품질 및 수강생 이탈 위험 모니터링

- KPI Cards: 전체 세션 수 / 평균 이해도 / 이탈 위험 수강생 수
- Recharts BarChart: 세션별 평균 이해도 비교
- DataTable: 이탈 위험 수강생 목록 (이름, 이해도 추이, 상담 권장 Badge)
- Recharts LineChart: 강사별 수업 품질 지표 추이

```
GET /api/sessions
GET /api/ai/analysis?academy_id={id}
```

흐름: 로그인(원장) → **경영 대시보드** → (읽기 전용 열람)  
모바일 대응: KPI 카드만 표시, 차트는 가로 스크롤

---

## 5. 화면 전환 전체 흐름

```
[로그인]
   ├─ 강사 → [세션 목록] → [세션 생성] → [수업 대시보드 🔴] → [리포트 목록]
   ├─ 수강생 → [세션 참여] → [퀴즈 응답 🔴] → [결과 확인] → [학습 리포트]
   └─ 원장 → [경영 대시보드]
```

---

## 6. 실시간 구독 요약

| 화면 | 구독 테이블 | 이벤트 |
|------|------------|--------|
| 수업 대시보드 | `session_participants` | INSERT |
| 수업 대시보드 | `responses` | INSERT |
| 수업 대시보드 | `analysis_results` | INSERT |
| 퀴즈 응답 (수강생) | `quizzes` | INSERT |
