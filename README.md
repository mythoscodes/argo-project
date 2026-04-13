# Argos — AI 실시간 수업 분석 플랫폼

> "100개의 눈으로 교실을 본다" — 팀 mythos

**강사는 오늘을 본다. 원장은 어제를 본다. 멘토는 내일을 막는다.**

Argos는 코리아IT아카데미(KIT) 강사가 수업 중 수강생의 이해도를 실시간으로 파악하고, AI가 교수법을 코칭하는 플랫폼입니다.

---

## 심사위원을 위한 핵심 기술 Deep-Dive 바로가기

| | 항목 | 내용 | 바로가기 |
|---|---|---|---|
| :rocket: | **상용화 수준의 품질 보증** | 97건의 화면별 상세 시나리오 및 1,146건의 E2E 자동화 테스트 통과 | [테스트케이스 확인](docs/tc/) |
| :shield: | **보안 및 데이터 무결성** | 학원 간 완벽한 데이터 격리 및 RLS 보안 아키텍처 | [Wiki 읽기](docs/wiki/) |
| :brain: | **AI 분석 엔진 상세 로직** | 3-Signal 복합 데이터를 활용한 조기 이탈 감지 알고리즘 명세서 | [상세 분석](docs/wiki/concept-risk-signal.md) |
| :bar_chart: | **데모 시나리오** | 심사위원용 10분 시연 스크립트 (4개 역할 흐름) | [데모 가이드](docs/DEMO_SCRIPT.md) |

### 테스트 계정 (비밀번호: `test1234`)

| 이메일 | 역할 | 이름 | 특성 |
|--------|------|------|------|
| `owner@kit.ac.kr` | 원장 | 박원장 | 학원 전체 대시보드 |
| `teacher@kit.ac.kr` | 강사 | 김강사 | 세션 3개, 퀴즈 15개 |
| `mentor@kit.ac.kr` | 멘토 | 이멘토 | 수강생 상담 관리 |
| `student1@kit.ac.kr` | 수강생 | 김민준 | 이탈 위험, 정답률 급락 |
| `student2@kit.ac.kr` | 수강생 | 이지수 | 주의, 정체 패턴 |
| `student3@kit.ac.kr` | 수강생 | 박서연 | 양호, 향상 패턴 |

> 로그인 페이지에서 **"테스트 계정으로 체험하기"** 버튼을 클릭하면 원클릭 로그인이 가능합니다.

---

## 핵심 기능

| ID | 기능 | 설명 | 상태 |
|----|------|------|------|
| F1 | 수업 세션 관리 | 강사가 세션 생성 → 참여 코드 발급 → 수강생 접속 | ✅ 완료 |
| F2 | AI 퀴즈 자동생성 | 수업 주제 입력 → AI가 코딩 특화 퀴즈 자동 생성 (3~15문제, 5개 난이도 프리셋) | ✅ 완료 |
| F3 | 수강생 실시간 응답 | 수강생이 모바일에서 객관식 + 주관식 퀴즈에 실시간 응답 | ✅ 완료 |
| F4 | 실시간 이해도 히트맵 | 개념별 이해도를 히트맵으로 실시간 시각화 | ✅ 완료 |
| F5 | AI 강사 코칭 | 이해도 분석 → 수준별 교수법 코칭 (비전공자/경력자 분리) | ✅ 완료 |
| F6 | 양방향 피드백 루프 | 보충 설명 후 재퀴즈 → 이해도 델타 시각화 | ✅ 완료 |
| F7 | 수강생 학습 리포트 | 수업 후 개인별 이해도 추이 + 학습 경로 추천 | ✅ 완료 |
| F8 | 원장 경영 대시보드 | 학원 전체 수업 품질 + 이탈 위험 + 수준 분포 모니터링 | ✅ 완료 |
| F9 | 멘토 이탈 방지 뷰 | AI 이탈 레이더 + 상담 브리핑 + 내부 강의 추천 | ✅ 완료 |
| F10 | AI 역량 진단 | 과목별 정기 수준 측정 + 레이더 차트 + 추적 | ✅ 완료 |

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router, Server Components) |
| DB / Auth / Realtime | Supabase (PostgreSQL + RLS + Realtime + Auth) |
| AI | Vercel AI SDK + Google Gemini 3 Flash ($0 무료 티어) |
| 검증 | Zod v4 (외부 입력 + AI 응답 전수 검증) |
| 프론트엔드 | Tailwind CSS v4 + Radix UI + Recharts |
| 테스트 | Vitest + Playwright (E2E 1,146건) |
| 배포 | Vercel (Edge) |
| 바이브코딩 | Claude Code (Opus 4.6, 1M context) |

---

## 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── ai/{quiz,analysis,coaching,report,mentor-briefing,assessment}/
│   │   ├── auth/register/
│   │   ├── sessions/, sessions/[id]/, sessions/join/
│   │   ├── quizzes/, responses/
│   │   ├── dashboard/
│   │   └── mentor/{students,students/[id],consultations}/
│   ├── landing/                   # 랜딩 페이지
│   ├── instructor/                # 강사 뷰 (세션 목록, 라이브 대시보드, 리포트)
│   ├── student/                   # 수강생 뷰 (대시보드, 퀴즈, 결과, 리포트, 역량 진단)
│   ├── owner/                     # 원장 뷰 (경영 대시보드 5탭)
│   └── mentor/                    # 멘토 뷰 (이탈 레이더, 수강생 상세)
├── components/ui/                 # shadcn/ui 스타일 컴포넌트 (16개)
├── hooks/                         # use-realtime, use-auth
├── lib/
│   ├── ai/{model,prompts/,schemas/}
│   ├── supabase/{client,server,rsc,admin,middleware}
│   └── constants.ts
└── types/database.ts

supabase/migrations/               # 8개 마이그레이션
scripts/seed-demo.ts               # 데모 시드 데이터
docs/
├── wiki/                          # 73페이지 Karpathy Wiki
├── tc/                            # 15화면 97건 테스트케이스
├── PLANNING.md                    # 기획서
├── STORYBOARD.md                  # UI 스토리보드
├── DEMO_SCRIPT.md                 # 심사위원용 데모 시나리오
├── CHANGELOG.md                   # 수정이력
├── SETUP_GUIDE.md                 # 환경 구축 가이드
└── MEETING_LOG.md                 # 회의록
```

---

## 시작하기

### 환경 변수

`.env.local` 파일을 생성하세요:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...

# AI (Gemini 3 Flash 기본 — 무료)
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

### 데모 데이터 시드

```bash
pnpm seed     # 테스트 계정 8개 + 수업/퀴즈/응답/분석 데이터 생성
```

### 테스트

```bash
pnpm test               # Vitest 단위 테스트
pnpm test:e2e           # Playwright E2E (1,146건)
```

---

## API 엔드포인트

### 세션 관리 (F1)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/sessions` | 세션 목록 조회 (역할 기반 필터링) |
| POST | `/api/sessions` | 세션 생성 |
| GET/PATCH/DELETE | `/api/sessions/[id]` | 세션 상세/수정/삭제 |
| POST | `/api/sessions/join` | 수강생 세션 참여 (참여 코드) |

### AI 기능 (F2, F4, F5, F7, F9, F10)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/ai/quiz` | AI 퀴즈 생성 (3~15문제, 난이도별) |
| GET/POST | `/api/ai/analysis` | 이해도 분석 (라운드별/전체) |
| POST | `/api/ai/coaching` | AI 강사 코칭 (구조화 6항목) |
| GET/POST | `/api/ai/report` | 수강생 학습 리포트 |
| POST | `/api/ai/mentor-briefing` | 멘토 상담 브리핑 |
| GET/POST | `/api/ai/assessment` | 과목별 AI 역량 진단 |

### 퀴즈/응답 (F3, F6)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/quizzes` | 퀴즈 조회 (수강생: 정답 마스킹) |
| GET/POST | `/api/responses` | 응답 제출/조회 |

### 대시보드/멘토 (F8, F9)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/dashboard` | 원장 경영 대시보드 |
| GET | `/api/mentor/students` | 수강생 이탈 위험 목록 (3-Signal) |
| GET | `/api/mentor/students/[id]` | 수강생 상세 (추이, 약점, 상담기록) |
| GET/POST | `/api/mentor/consultations` | 상담 기록 CRUD |

---

## 역할별 화면

| 역할 | 시간축 | 핵심 화면 | 화면 수 |
|------|--------|----------|---------|
| 강사 | 지금 이 순간 | 라이브 대시보드 (히트맵 + AI 코칭 + 퀴즈 프리셋) | 4 |
| 수강생 | 수업 중/후 | 퀴즈 응답 + 결과 + 리포트 + 역량 진단 | 6 |
| 원장 | 어제까지 | 경영 대시보드 5탭 (개요/세션/수강생/수준분포/이탈) | 1 (5탭) |
| 멘토 | 내일을 막는다 | 이탈 레이더 + AI 상담 브리핑 + 상담 기록 | 2 |

---

## 상세 문서

### 핵심 문서
| 문서 | 내용 |
|------|------|
| [기획서](docs/PLANNING.md) | 사용자·문제·솔루션·AI 전략·ROI |
| [스토리보드](docs/STORYBOARD.md) | 전체 화면 흐름 + 실시간 구독 설계 |
| [데모 시나리오](docs/DEMO_SCRIPT.md) | 심사위원용 10분 시연 스크립트 |
| [수정이력](docs/CHANGELOG.md) | 개발 과정 전체 변경 기록 |

### 기술 문서
| 문서 | 내용 |
|------|------|
| [Wiki (73p)](docs/wiki/) | API 명세, 도메인 개념, RLS 정책, 컴포넌트, 테스트 전략 |
| [테스트케이스 (97건)](docs/tc/) | 15화면 상세 시나리오 (Must/Should/Nice 우선순위) |
| [DB 스키마](docs/wiki/SCHEMA.md) | ERD + 테이블 정의 + RLS 규칙 |
| [3-Signal 알고리즘](docs/wiki/concept-risk-signal.md) | 정답률+응답속도+출석 복합 이탈 감지 |
| [셋업 가이드](docs/SETUP_GUIDE.md) | 환경 구축 단계별 안내 |

---

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
