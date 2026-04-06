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

## 5. 멘토 뷰 (F9 — 이탈 방지)

> 포지셔닝: **"강사는 오늘을 본다. 원장은 어제를 본다. 멘토는 내일을 막는다."**
> 멘토(학습 상담사)는 수업을 직접 하지 않지만, 수강생의 이탈 위험을 선제적으로 감지하고 상담으로 개입합니다.
> 강사 계정으로 접근 가능 (별도 role 불필요, instructor role 재활용)

### 담당 수강생 목록 (`/mentor`)
화면 목적: 오늘 누구에게 먼저 연락해야 할지 — AI 이탈 레이더 기반 우선순위 표시

- Alert Banner: "오늘 상담 필요 N명" (이탈 위험 HIGH 수강생 수)
- Card List: 담당 수강생 카드 (이탈 위험도순 기본 정렬)
  - 각 카드: 이름 / 이탈 위험 스코어 Badge (위험🔴 / 주의🟡 / 양호🟢) / 3-signal 요약 한 줄
  - 3-signal: ① 최근 3세션 정답률 < 40% ② 응답 속도 상승 추세 ③ 세션 미참여 연속 2회+
  - 3개 중 2개 이상 해당 시 "위험🔴", 1개 해당 시 "주의🟡"
- Filter Tabs: 위험도별 / 과정별
- 모바일: 스와이프 카드, 한 줄당 카드 1개

```
GET /api/mentor/students          (담당 수강생 + 이탈 위험 스코어)
```

흐름: 강사 뷰 → 멘토 탭 진입 → **담당 수강생 목록** → 카드 탭 → 수강생 상세

---

### 수강생 상세 (`/mentor/students/[id]`)
화면 목적: 해당 수강생의 학습 전체 흐름 파악 + AI 상담 브리핑 + 상담 기록 관리

#### 레이아웃 (4개 섹션)

**① AI 이탈 예측 카드 (상단)**
- 이탈 위험 스코어 Badge (대형)
- 3-signal 각각 시각화: 정답률 미니 스파크라인 / 응답 속도 추세 화살표 / 출석 현황 도트
- Button: "AI 상담 브리핑 생성" → 대화 포인트 3가지 + 약점 분석 + 권장 상담 전략 + **내부 강의 추천**
  - 내부 강의 추천: 수강생 약점 토픽과 `courses.topics` 매칭 → "이 수강생에게 적합한 내부 강의 1~2개" 추천
  - 예시: "추천 강의: Spring Data JPA 심화 (화/목 14:00, 박강사) — 약점 토픽 3개 중 2개 커버"

```
POST /api/ai/mentor-briefing     (AI 상담 브리핑 생성 — F7 프롬프트 재활용, courses 컨텍스트 포함)
```

**② 학습 추이 차트 (중단 좌)**
- Recharts LineChart: 최근 5세션 정답률 추이 (세션별 평균)
- Recharts RadarChart: 토픽별 이해도 (약점 개념 6축)
- 데이터 출처: responses (정답률), analysis_results (약점 토픽)

```
GET /api/mentor/students/[id]     (수강생 상세 데이터)
```

**③ 약점 토픽 태그 (중단 우)**
- Tag List: AI가 추출한 취약 개념 (예: "Spring MVC", "예외처리", "JPA N+1")
- 각 태그에 이해도 % 표시
- 데이터 출처: student_reports.weak_topics / analysis_results

**④ 상담 기록 타임라인 (하단)**
- Timeline: 최신순 상담 기록 (날짜 + 유형 Badge + 한줄 요약)
- FAB Button: "상담 기록 추가" → 슬라이드업 모달
  - 유형 Select: 학습부진 / 진로 / 출결 / 기타
  - 내용 Textarea: 자유 형식 메모
  - DatePicker: 다음 상담 예정일
  - Button: 저장

```
GET  /api/mentor/consultations?student_id={id}  (상담 기록 조회)
POST /api/mentor/consultations                   (상담 기록 저장)
```

흐름: 담당 수강생 목록 → **수강생 상세** → AI 브리핑 확인 → 상담 기록 추가 → 목록 복귀
모바일 대응: 섹션을 아코디언으로 접기/펼치기, 상담 기록 입력은 풀스크린 모달

---

### 멘토 뷰 — 원장 뷰 차별점

| | 원장 뷰 | 멘토 뷰 |
|---|---|---|
| **관심 단위** | 아카데미 전체 | 개별 수강생 1:1 |
| **시간축** | 과거 집계 (어제까지) | 미래 예측 (내일을 막는다) |
| **핵심 지표** | 과정별 평균 이해도, 강사별 품질, 수료율 | 개인 정답률 추이, 이탈 위험 3-signal, 상담 이력 |
| **핵심 액션** | 전략적 의사결정 (읽기 전용) | 오늘 연락할 수강생 파악, 상담 기록 작성 |
| **AI 활용** | 경영 분석 | 상담 브리핑 자동생성, 이탈 위험 예측 |

### 킬러 피처

1. **AI 이탈 레이더**: 3-signal composite (정답률 + 응답 속도 + 출석)로 이탈 위험 자동 산출. 규칙 기반으로 AI 호출 없이 안정적 동작
2. **AI 상담 브리핑 자동생성**: 수강생 클릭 → "오늘 상담 대화 포인트 3가지" + **내부 강의 추천** 즉시 생성. 기존 F7 리포트 프롬프트 재활용, Gemini Flash로 구현
3. **AI 내부 강의 추천**: 수강생 약점 토픽 × 내부 강의 카탈로그(`courses`) 매칭 → 적합한 강의 1~2개 추천. 상담 브리핑에 통합되어 별도 API 불필요

### 데모 시드 데이터 (3-persona)

| 수강생 | 정답률 패턴 | 출석 | 응답속도 | 이탈 판정 |
|--------|------------|------|---------|---------|
| 김민준 | 80→60→35% (급락) | 1회 미참석 | 증가 | 위험🔴 |
| 이지수 | 55→60→58% (정체) | 전출석 | 보통 | 주의🟡 |
| 박서연 | 75→80→85% (향상) | 전출석 | 감소 | 양호🟢 |

### 신규 DB 테이블

```sql
-- 상담 기록
consultation_notes (
  id uuid PRIMARY KEY,
  instructor_id uuid REFERENCES profiles(id),  -- 멘토(강사) ID
  student_id uuid REFERENCES profiles(id),
  academy_id uuid REFERENCES academies(id),
  type text CHECK (type IN ('학습부진', '진로', '출결', '기타')),
  content text,
  next_consultation_date date,
  created_at timestamptz DEFAULT now()
)
-- RLS: instructor_id = auth.uid() 기반, 기존 instructor RLS 패턴 재활용

-- 내부 강의 카탈로그 (AI 강의 추천용)
courses (
  id uuid PRIMARY KEY,
  academy_id uuid REFERENCES academies(id),
  title text,                -- "Spring Data JPA 심화"
  category text,             -- "Spring" / "React" / "Python" / "보안" / "네트워크"
  topics text[],             -- ["JPA", "N+1", "영속성 컨텍스트"]
  instructor_name text,
  schedule text,             -- "매주 화/목 14:00"
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
)
-- RLS: academy_id 기반 읽기 허용
-- 시드 데이터: KIT 실제 과정 기반 5~10개 강의 사전 등록
```

---

## 6. 화면 전환 전체 흐름

```
[로그인]
   ├─ 강사 → [세션 목록] → [세션 생성] → [수업 대시보드 🔴] → [리포트 목록]
   │                                                            └─ [멘토: 담당 수강생 목록] → [수강생 상세]
   ├─ 수강생 → [세션 참여] → [퀴즈 응답 🔴] → [결과 확인] → [학습 리포트]
   └─ 원장 → [경영 대시보드]
```

---

## 7. 실시간 구독 요약

| 화면 | 구독 테이블 | 이벤트 |
|------|------------|--------|
| 수업 대시보드 | `session_participants` | INSERT |
| 수업 대시보드 | `responses` | INSERT |
| 수업 대시보드 | `analysis_results` | INSERT |
| 퀴즈 응답 (수강생) | `quizzes` | INSERT |
