# Argos Wiki

> Karpathy Wiki 패턴 기반 내부 지식 베이스. 스키마는 [[SCHEMA]]에 정의.
>
> 최종 갱신: 2026-04-11

## 어디서 시작할까?

처음 읽는다면:
1. [[SCHEMA]] — 이 wiki의 구조·규칙
2. [[concept-session]] — Argos 핵심 개념
3. [[feature-f1-session]] — 가장 먼저 구현된 기능
4. [[role-teacher]] — 주요 사용자 역할
5. `CLAUDE.md` (raw source) — 프로젝트 전체 코딩 규칙

특정 화면을 조사한다면 → `screen-*` 에서 시작.
특정 API를 조사한다면 → `api-*` 에서 시작.
RLS/보안을 조사한다면 → `rls-*` 에서 시작.

---

## 카테고리별 페이지 인덱스

> ⚠️ **초기 상태**. Cycle 2 Wiki 적용 작업(T15)으로 채워지는 중.

### concept-* (도메인 개념)
_작성 중 — planner 담당_

- [[concept-session]] — 강사가 개설하는 실시간 수업 컨테이너 (draft→active→completed)
- [[concept-quiz]] — AI 생성 퀴즈 단위. 5가지 유형, round_number 회차, misconception_tags 오개념 추적
- [[concept-understanding-score]] — topic_tag별 정답률(0~100). WEAK_TOPIC_THRESHOLD=60, 회차 델타 계산
- [[concept-heatmap]] — 수강생×토픽 교차 히트맵. 초록/노랑/빨강 3단계, Supabase Realtime 자동 갱신
- [[concept-risk-signal]] — 이탈 위험 신호 3종(정답률·속도·출석). HIGH/MEDIUM/LOW 분류 알고리즘
- [[concept-join-code]] — 6자리 영숫자 참여 코드. active 전환 시 생성, O/I/1/0 제외 문자셋
- [[concept-academy-isolation]] — academy_id 기반 다중 학원 RLS 격리. SECURITY DEFINER 재귀 해소

### feature-f{n}-* (F1~F9 기능)
_작성 완료 — planner 담당_

- [[feature-f1-session]] — 세션 CRUD·상태전환(draft→active→completed)·join_code 발급
- [[feature-f2-quiz-generation]] — AI 퀴즈 생성 (5유형, temperature=0.3, 1회 재시도)
- [[feature-f3-response-collection]] — 수강생 응답 수집 + Realtime 실시간 갱신
- [[feature-f4-heatmap]] — 수강생×토픽 히트맵 렌더링 + Realtime 연동
- [[feature-f5-ai-coaching]] — AI 교수법 코칭 (temperature=0.5, 약점토픽 컨텍스트)
- [[feature-f6-feedback-loop]] — 재퀴즈(round_number 증분) + 회차 delta 계산
- [[feature-f7-report]] — AI 수강생 개인 리포트 생성·저장 (P1)
- [[feature-f8-owner-dashboard]] — 원장·멘토 위험 수강생 대시보드 (P2, 구현 완료)
- [[feature-f9-sharing]] — 멘토 AI 브리핑 + 상담 기록(consultation_notes)

### role-* (사용자 역할)
_작성 완료 — planner 담당_

- [[role-teacher]] — 수업 담당 강사. 세션 생성·퀴즈 생성·코칭 주체. teacher_id 소유권 이중 검증
- [[role-student]] — 수강생. join_code 입장, 응답 제출만 허용. 정답 조건부 노출
- [[role-mentor]] — 상담사. 학원 전체 세션 읽기 + 위험 신호 모니터링. Cycle 1에서 추가 (migration 00007)
- [[role-owner]] — 원장. teacher 권한 + 학원 KPI 대시보드 + 상담 전체 조회

### screen-* (화면)
_analyst-2 담당_

- [[screen-common-home]] — `/` 루트. 역할별 리다이렉트 허브 (teacher→/instructor, student→/student/sessions, mentor→/mentor)
- [[screen-login]] — `/login`. 이메일+비밀번호 Supabase Auth 로그인. 미로그인 redirect 진입점
- [[screen-register]] — `/register`. 학원코드+역할+이름+이메일+비밀번호 회원가입 폼
- [[screen-instructor-dashboard]] — `/instructor`. 강사 세션 목록(draft/active/ended). T4-hotfix role guard
- [[screen-instructor-session-new]] — `/instructor/sessions/new`. 세션 제목·과목·카테고리·토픽 입력 폼
- [[screen-instructor-session-detail]] — `/instructor/sessions/[id]`. 퀴즈 생성·발행·히트맵·코칭 AI 통합 화면
- [[screen-student-join]] — `/student/join`. join_code 6자리 입력 → POST /api/sessions/join
- [[screen-student-session]] — `/student/sessions/[id]`. 실시간 퀴즈 수신·답변 제출. Realtime 구독
- [[screen-student-result]] — `/student/sessions/[id]/result`. 세션 종료 후 본인 성적 열람
- [[screen-student-report]] — `/student/report`. 누적 퀴즈 이력·AI 리포트 열람
- [[screen-mentor-list]] — `/mentor`. 멘토 담당 수강생 목록 + 위험 신호 배지
- [[screen-mentor-student-detail]] — `/mentor/students/[id]`. 수강생 상세·이해도 그래프·상담 기록 CRUD
- [[screen-owner-dashboard]] — `/owner`. 원장 전용. 학원 전체 세션통계·위험수강생·avgUnderstanding
- [[screen-instructor-session-reports]] — `/instructor/sessions/[id]/reports`. 분석이력 + AI 리포트 생성

### api-* (API Route)
_analyst-2 담당_

- [[api-sessions]] — GET/POST /api/sessions. 세션 목록 조회 + 신규 세션 생성 (draft)
- [[api-sessions-id]] — GET/PATCH/DELETE /api/sessions/[id]. join_code 발급(PATCH→active), non-teacher join_code 필터
- [[api-sessions-join]] — POST /api/sessions/join. join_code 검증 → session_participants INSERT
- [[api-quizzes]] — GET/POST /api/quizzes. 퀴즈 목록 조회 + AI 생성 퀴즈 저장
- [[api-responses]] — GET/POST /api/responses. 수강생 답변 제출 + 이해도 집계
- [[api-ai-quiz]] — POST /api/ai/quiz. Gemini로 퀴즈 JSON 생성. Zod 검증 + 1회 retry
- [[api-ai-analysis]] — POST /api/ai/analysis. 응답 데이터 기반 이해도 분석
- [[api-ai-coaching]] — POST /api/ai/coaching. 강사용 AI 코칭 제안 생성
- [[api-ai-report]] — POST /api/ai/report. 수강생 누적 리포트 생성
- [[api-ai-mentor-briefing]] — POST /api/ai/mentor-briefing. 멘토용 수강생 위험 브리핑
- [[api-mentor-students]] — GET /api/mentor/students. 담당 수강생 목록 + 3-signal 위험 계산
- [[api-mentor-students-id]] — GET /api/mentor/students/[id]. 수강생 상세 + 퀴즈 이력 + 이해도
- [[api-mentor-consultations]] — GET/POST /api/mentor/consultations. 상담 기록 조회·생성
- [[api-auth-register]] — POST /api/auth/register. 학원코드 검증 + Supabase Auth + profile INSERT
- [[api-dashboard]] — GET /api/dashboard. 원장용 학원 전체 통계 집계

### component-* (UI 컴포넌트)
_analyst-2 담당_

- [[component-understanding-heatmap]] — 수강생×토픽 정답률 히트맵. 이중 Map O(1) 조회, null=미응답
- [[component-delta-chart]] — 라운드별 토픽 이해도 변화 BarChart. ±30% 고정 도메인

### hook-* (React hooks)
_analyst-2 담당_

- [[hook-use-realtime]] — useRealtimeResponses. Supabase Realtime 구독, CHANNEL_ERROR/TIMED_OUT 처리, dedup

### lib-* (src/lib/**)
_analyst-2 담당_

- [[lib-supabase-server]] — createClient() Route Handler용. getAll 전용, setAll 의도적 생략
- [[lib-supabase-rsc]] — createClient() Server Component용. server.ts와 동일 구조, import 추적용 분리
- [[lib-supabase-middleware]] — createServerClient() with getAll+setAll. JWT 갱신 유일 지점
- [[lib-supabase-client]] — createBrowserClient() 브라우저 전용 9줄 래퍼. hook-use-realtime에서만 사용
- [[lib-ai-model]] — getModel(purpose?) 팩토리. ENV_KEY_MAP으로 purpose별 모델 선택
- [[lib-ai-prompts]] — 4개 프롬프트 파일. getFewShotExample(subject) 5개 분기, JSON-only 지시
- [[lib-ai-schemas]] — Zod v4 스키마 모음. reportResponseSchema, quizSchema 등
- [[lib-constants]] — 전역 상수: RISK_* 임계값, SESSION_CODE_LENGTH, WEAK_TOPIC_THRESHOLD, AI temp

### rls-* (RLS 정책)
_analyst-2 담당_

- [[rls-profiles]] — 00001 서브쿼리 자기참조 → 00006 SECURITY DEFINER 재귀 해소. Cycle 1 Issue 1 원인
- [[rls-sessions]] — academy_id 격리. UPDATE는 teacher_id 체크만 (academy_id 없음 — Gotcha)
- [[rls-responses]] — SELECT: sessions 서브쿼리. INSERT: student_id=auth.uid(). 학생 격리는 API 레벨
- [[rls-consultation-notes]] — 00006 INSERT role 체크 누락 → 00007 복원 + mentor 추가
- [[rls-join-code]] — column-level RLS 불가 → API 필드목록 SELECT + Object.entries 이중 필터
- [[rls-academies]] — id = get_my_academy_id(). INSERT/UPDATE 정책 없음 — service_role 전용

### test-* (테스트 전략)
_작성 예정 — team-lead_
<!-- 예정: test-e2e-strategy, test-ai-mocking, test-rls-cross-check -->

### process-* (프로세스)
_작성 예정 — team-lead_
<!-- 예정: process-cycle-scrum, process-qa-regression -->

---

## 작성 현황

| 카테고리 | 작성 완료 | 예상 총 | 담당 |
|---------|----------|--------|------|
| concept | 7 | ~10 | planner |
| feature | 9 | 9 | planner |
| role | 4 | 4 | planner |
| screen | 14 | 14 | analyst-2 |
| api | 15 | 15 | analyst-2 |
| component | 2 | ~4 | analyst-2 |
| hook | 1 | 2 | analyst-2 |
| lib | 8 | 8 | analyst-2 |
| rls | 6 | 6 | analyst-2 |
| test | 0 | ~4 | team-lead |
| process | 0 | ~3 | team-lead |
| **합계** | **62** | **~79** | — |

## 링크 건전성

- orphan 페이지 (Connections 없는 페이지): 0
- broken link (`[[xxx]]`가 존재하지 않는 파일 가리킴): 0
- 양방향 누락: 0

(Cycle 2 진행하며 주기적으로 grep 검증)

---

## 관련 Raw Sources

이 wiki의 내용이 파생되는 원본 문서들 (모두 읽기 전용):

- `CLAUDE.md` — 프로젝트 코딩 규칙 (Raw Source)
- `docs/PLANNING.md` — 기획서 (Raw Source)
- `docs/MEETING_LOG.md` — 회의록 (Raw Source)
- `docs/tc/*.md` — 14개 화면 QA TC 시트 (Raw Source, 다만 `screen-*` wiki에서 참조)
- `docs/scrum/*.md` — Cycle 1~2 회고/분석/비평 (Raw Source)
- `supabase/migrations/*.sql` — DB 스키마/RLS 정책 (Raw Source)
- `src/**` — 구현 코드 (Raw Source)
