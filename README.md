# Argos — AI 실시간 수업 분석 플랫폼

> "100개의 눈으로 교실을 본다" — 팀 mythos

**강사는 오늘을 본다. 원장은 어제를 본다. 멘토는 내일을 막는다.**

Argos는 코리아IT아카데미(KIT) 강사가 수업 중 수강생의 이해도를 실시간으로 파악하고, AI가 교수법을 코칭하는 플랫폼입니다.

## 핵심 기능

| ID | 기능 | 설명 | 상태 |
|----|------|------|------|
| F1 | 수업 세션 관리 | 강사가 세션 생성 → 참여 코드 발급 → 수강생 접속 | ✅ 완료 |
| F2 | AI 퀴즈 자동생성 | 수업 주제 입력 → AI가 코딩 특화 퀴즈 자동 생성 | ✅ 완료 |
| F3 | 수강생 실시간 응답 | 수강생이 모바일에서 퀴즈에 실시간 응답 | ✅ 완료 |
| F4 | 실시간 이해도 히트맵 | 개념별 이해도를 히트맵으로 실시간 시각화 | ✅ 완료 |
| F5 | AI 강사 코칭 | 이해도 분석 → 실시간 코칭 메시지 제공 | ✅ 완료 |
| F6 | 양방향 피드백 루프 | 보충 설명 후 재퀴즈 → 이해도 델타 시각화 | ✅ 완료 |
| F7 | 수강생 학습 리포트 | 수업 후 개인별 이해도 추이 + 학습 경로 추천 | ✅ 완료 |
| F8 | 원장 경영 대시보드 | 학원 전체 수업 품질 + 이탈 위험 모니터링 | ✅ 완료 |
| F9 | 멘토 이탈 방지 뷰 | AI 이탈 레이더 + 상담 브리핑 + 내부 강의 추천 | ✅ 완료 |

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router, Server Components) |
| DB / Auth / Realtime | Supabase (PostgreSQL + RLS + Realtime + Auth) |
| AI | Vercel AI SDK + Google Gemini 3 Flash |
| 검증 | Zod v4 (외부 입력 + AI 응답 전수 검증) |
| 프론트엔드 | Tailwind CSS + shadcn/ui + Recharts |
| 테스트 | Vitest |
| 배포 | Vercel |
| 언어 | TypeScript (strict mode) |

## 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── quiz/route.ts           # F2 AI 퀴즈 생성
│   │   │   ├── analysis/route.ts       # F4 이해도 분석
│   │   │   ├── coaching/route.ts       # F5 AI 코칭
│   │   │   ├── report/route.ts         # F7 학습 리포트
│   │   │   └── mentor-briefing/route.ts # F9 AI 상담 브리핑
│   │   ├── sessions/                    # F1 세션 관리
│   │   ├── quizzes/                     # F2 퀴즈 CRUD
│   │   ├── responses/                   # F3 응답 제출
│   │   ├── dashboard/                   # F8 원장 대시보드
│   │   └── mentor/                      # F9 멘토 뷰
│   │       ├── students/route.ts        #   수강생 목록 + 이탈 스코어
│   │       ├── students/[id]/route.ts   #   수강생 상세
│   │       └── consultations/route.ts   #   상담 기록 CRUD
│   ├── instructor/                      # 강사 뷰 (프론트엔드)
│   ├── student/                         # 수강생 뷰 (프론트엔드)
│   └── login/                           # 로그인
├── lib/
│   ├── ai/
│   │   ├── model.ts                     # AI 모델 중앙 관리
│   │   ├── prompts/                     # AI 프롬프트 (quiz, coaching, report, mentor-briefing)
│   │   └── schemas/                     # Zod 응답 스키마
│   ├── supabase/                        # Supabase 클라이언트 (client/server)
│   ├── constants.ts                     # 상수 정의
│   └── utils.ts
├── hooks/                               # 커스텀 훅 (Realtime 등)
└── types/                               # TypeScript 타입 (database, ai)

supabase/
├── migrations/
│   ├── 00001_initial_schema.sql         # 초기 스키마 (9개 테이블)
│   └── 00002_mentor_tables.sql          # F9 멘토 테이블 (courses, consultation_notes)
└── seed.sql
```

## 시작하기

### 환경 변수

`.env.local` 파일을 생성하세요:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...

# AI (Gemini 3 Flash 기본)
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key

# 선택: Claude Sonnet (품질 최우선 시)
# ANTHROPIC_API_KEY=your_anthropic_key
# AI_MODEL=claude-sonnet
```

### 설치 및 실행

```bash
pnpm install
pnpm dev
```

### 테스트

```bash
pnpm test           # 전체 테스트 실행
pnpm test:watch     # 워치 모드
```

### Supabase 로컬 개발

```bash
supabase start
supabase db reset    # 마이그레이션 적용
```

## API 엔드포인트

### 세션 관리 (F1)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/sessions` | 세션 목록 조회 |
| POST | `/api/sessions` | 세션 생성 |
| GET | `/api/sessions/[id]` | 세션 상세 |
| POST | `/api/sessions/join` | 수강생 세션 참여 |

### AI 기능 (F2, F4, F5, F7, F9)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/ai/quiz` | AI 퀴즈 생성 |
| GET/POST | `/api/ai/analysis` | 이해도 분석 |
| POST | `/api/ai/coaching` | AI 강사 코칭 |
| GET/POST | `/api/ai/report` | 수강생 학습 리포트 |
| POST | `/api/ai/mentor-briefing` | 멘토 상담 브리핑 |

### 퀴즈/응답 (F3, F6)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/quizzes` | 퀴즈 조회 |
| GET/POST | `/api/responses` | 응답 제출/조회 |

### 원장 대시보드 (F8)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/dashboard` | 경영 대시보드 데이터 |

### 멘토 뷰 (F9)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/mentor/students` | 담당 수강생 + 이탈 위험 스코어 |
| GET | `/api/mentor/students/[id]` | 수강생 상세 (추이, 약점, 상담기록) |
| GET/POST | `/api/mentor/consultations` | 상담 기록 조회/저장 |

## 역할별 화면

| 역할 | 시간축 | 핵심 화면 |
|------|--------|----------|
| 강사 | 지금 이 순간 | 수업 대시보드 (실시간 히트맵 + AI 코칭) |
| 수강생 | 수업 중/후 | 퀴즈 응답 + 학습 리포트 |
| 원장 | 어제까지 | 경영 대시보드 (KPI + 이탈 위험) |
| 멘토 | 내일을 막는다 | 이탈 레이더 + AI 상담 브리핑 |

## 팀

| 역할 | 도구 |
|------|------|
| 기획 · 백엔드 · AI · DB | Claude Code (Opus 4.6) |
| 프론트엔드 · 디자인 | 팀원 담당 |

## 공모전

- **대회**: 2026 KIT 바이브코딩 공모전
- **주제**: AI활용 차세대 교육 솔루션
- **팀명**: mythos
- **프로젝트명**: Argos (그리스 신화 100개의 눈을 가진 거인)

## 문서

- [기획서](docs/PLANNING.md) — 기능 상세, 데모 시나리오, AI 전략
- [스토리보드](docs/STORYBOARD.md) — 프론트엔드 화면 설계
- [셋업 가이드](docs/SETUP_GUIDE.md) — 개인 PC 환경 구축
- [회의록](docs/MEETING_LOG.md) — 의사결정 과정 기록
