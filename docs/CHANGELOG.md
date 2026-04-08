# Argos 수정이력

## 2026-04-08 — 프론트엔드 전체 구축 + 버그 수정

### 1. 프론트엔드 신규 구축

#### 의존성 추가
- Radix UI (Dialog, Select, Tabs, Accordion, Avatar, RadioGroup, Label, Progress, Separator, Tooltip, DropdownMenu, Slot)
- class-variance-authority (CVA) — 컴포넌트 variant 관리
- Lucide React — 아이콘
- Recharts — 차트 (BarChart, LineChart, RadarChart)

#### UI 컴포넌트 (src/components/ui/) — 13개
| 파일 | 설명 |
|------|------|
| button.tsx | 7 variants (default, destructive, outline, secondary, ghost, link, success) × 5 sizes |
| card.tsx | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| badge.tsx | 12 variants (상태별 + 위험도별 색상) |
| input.tsx | 포커스 링 + 접근성 |
| textarea.tsx | 자동 높이 |
| label.tsx | Radix Label |
| tabs.tsx | Radix Tabs |
| dialog.tsx | Radix Dialog + 닫기 버튼 |
| select.tsx | Radix Select + 체크 아이콘 |
| progress.tsx | Radix Progress + 애니메이션 |
| separator.tsx | 수평/수직 구분선 |
| avatar.tsx | Radix Avatar + Fallback |
| radio-group.tsx | Radix RadioGroup |
| accordion.tsx | Radix Accordion + 회전 화살표 |
| spinner.tsx | CSS 스피너 (sm/md/lg) |
| empty-state.tsx | 빈 상태 안내 |

#### 레이아웃/인증
| 파일 | 설명 |
|------|------|
| src/components/layout/navbar.tsx | 역할별 네비게이션, 모바일 반응형 메뉴 |
| src/hooks/use-auth.ts | Supabase Auth 상태 훅 (userId, profile, isLoading) |
| src/app/layout.tsx | 루트 레이아웃 (한국어 lang, Geist 폰트, 메타데이터) |
| src/app/page.tsx | 역할별 자동 리다이렉트 (Server Component) |
| src/app/login/page.tsx | 이메일/비밀번호 로그인 + 역할별 리다이렉트 |
| src/app/register/page.tsx | 회원가입 (이름, 이메일, 비밀번호, 역할 선택, 학원 생성) |
| src/app/{instructor,student,owner,mentor}/layout.tsx | 역할별 레이아웃 |

#### 페이지 (10개)
| 경로 | 역할 | 핵심 기능 |
|------|------|-----------|
| /login | 공통 | Supabase Auth 로그인 |
| /register | 공통 | 회원가입 (강사/수강생/원장) |
| /instructor | 강사 | 세션 목록 + 상태별 통계 카드 |
| /instructor/sessions/new | 강사 | 세션 생성 (주제 태그, 카테고리, 익명모드) |
| /instructor/sessions/[id] | 강사 | **라이브 대시보드** — 참여코드, AI퀴즈생성, 이해도 히트맵, AI코칭, 피드백루프 (4패널) |
| /instructor/sessions/[id]/reports | 강사 | AI 분석 리포트 + 라운드별 추이 LineChart |
| /student/join | 수강생 | 6자리 참여 코드 입력 (자동포커스, 붙여넣기, 모바일 최적화) |
| /student/sessions/[id] | 수강생 | 실시간 퀴즈 응답 (코드 스니펫, 대형 터치 영역) |
| /student/sessions/[id]/result | 수강생 | 정답/오답 결과 카드 + 점수 요약 |
| /student/sessions/[id]/report | 수강생 | AI 학습 리포트 (RadarChart + 취약 개념 + AI 추천) |
| /owner | 원장 | 경영 대시보드 (KPI 4개, BarChart, 이탈위험 목록) |
| /mentor | 멘토 | 담당 수강생 목록 (3-signal 이탈 위험, 필터 탭) |
| /mentor/students/[id] | 멘토 | 수강생 상세 (AI 브리핑, 정답률 추이, 토픽 레이더, 상담 기록 CRUD) |

#### 실시간/차트 컴포넌트
| 파일 | 설명 |
|------|------|
| src/components/heatmap/understanding-heatmap.tsx | 주제별 × 수강생별 이해도 격자 (녹/황/적) |
| src/components/charts/delta-chart.tsx | 라운드 간 이해도 변화 BarChart |

### 2. 회원가입 기능 추가

| 파일 | 설명 |
|------|------|
| src/app/api/auth/register/route.ts | 회원가입 API (Zod 검증, Auth 생성, 프로필 삽입, 실패 시 롤백) |
| src/lib/supabase/admin.ts | Service-role 클라이언트 (RLS 우회, 서버 전용) |
| src/app/register/page.tsx | 회원가입 UI |
| src/app/login/page.tsx | 하단에 회원가입 링크 추가 |

### 3. RLS 무한 재귀 버그 수정

**원인**: `profiles_select_same_academy` 정책이 `SELECT academy_id FROM profiles WHERE id = auth.uid()` 서브쿼리 사용 → 동일 테이블 SELECT에 같은 RLS 재적용 → 무한 재귀 (PostgreSQL 42P17)

**수정**: SECURITY DEFINER 함수 `get_my_academy_id()`, `get_my_role()` 생성하여 RLS 우회. 전 테이블(profiles, academies, sessions, quizzes, responses, analysis_results, student_reports, courses, consultation_notes) 정책을 이 함수 사용하도록 교체.

| 파일 | 설명 |
|------|------|
| supabase/migrations/00006_fix_profiles_rls_recursion.sql | SECURITY DEFINER 함수 + 전 테이블 RLS 정책 교체 |

### 4. 프론트엔드-백엔드 필드명 불일치 수정

**원인**: 프론트엔드가 `snake_case`로 보내고 백엔드 Zod 스키마가 `camelCase`를 기대

**수정 내역**:
| 페이지 | 수정 전 (snake_case) | 수정 후 (camelCase) |
|--------|---------------------|---------------------|
| 세션 생성 | course_category, anonymous_mode | courseCategory, anonymousMode |
| 세션 참여 | join_code, session_id | joinCode, sessionId |
| 퀴즈 응답 | quiz_id, session_id, selected_answer, response_time_ms | quizId, sessionId, selectedAnswer, responseTimeMs |
| 퀴즈 GET | ?session_id= | ?sessionId= |
| 응답 GET | ?session_id= | ?sessionId= |
| 분석 GET/POST | session_id | sessionId |
| 코칭 POST | session_id | sessionId |
| 리포트 GET/POST | session_id | sessionId |
| 멘토 상담 GET | ?student_id= | ?studentId= |
| 멘토 상담 POST | student_id, next_consultation_date | studentId, nextConsultationDate |
| 멘토 브리핑 POST | student_id | studentId |

**퀴즈 생성 API 필수 필드 누락 수정**: 프론트엔드가 `sessionId`만 보내던 것 → `sessionId`, `subject`, `topic`, `count`, `difficulty` 모두 세션 데이터에서 자동 추출하여 전송하도록 수정

### 5. 기타 버그 수정

| 항목 | 설명 |
|------|------|
| use-realtime.ts | 초기 데이터 로드 추가 (기존: INSERT 이벤트만 수신 → 페이지 로드 시 기존 응답 누락) |
| middleware.ts | 인증 보호 추가 (미인증 → /login 리다이렉트, 인증+로그인페이지 → / 리다이렉트) |
| globals.css | Tailwind v4 디자인 시스템 (CSS 변수 기반 라이트/다크 테마) |
| 세션 카테고리 | 한글 자유입력 → DB enum 매칭 (programming, security, network, ...) |

### 6. 디자인 시스템

- **스타일링**: Tailwind CSS v4 + Radix UI + CVA (shadcn/ui 패턴)
- **테마**: CSS 변수 기반 라이트/다크 모드 자동 전환
- **색상 체계**: Primary(Blue), Success(Green), Warning(Amber), Destructive(Red)
- **반응형**: 모바일 우선, 강사 대시보드는 모바일=탭 / 데스크탑=2x2 그리드
