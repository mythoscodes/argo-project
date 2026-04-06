# 에이전트 팀 운영 규칙

## 팀 구성
- **팀 리드**: Opus — 설계, 코드 리뷰, 태스크 배분, 품질 관리
- **백엔드 개발**: Sonnet (`backend-dev`) — API Routes, Supabase 연동
- **AI 엔지니어**: Sonnet (`ai-engineer`) — 프롬프트, AI SDK 연동
- **DB 아키텍트**: Sonnet (`db-architect`) — 스키마, 마이그레이션, RLS
- **프론트엔드**: 별도 팀원이 담당 (에이전트 범위 밖)

## 워크플로우
1. 팀 리드가 TaskCreate로 태스크 생성 + 의존성 설정
2. 에이전트 spawn 시 `isolation: "worktree"` 사용 → 격리된 환경에서 작업
3. 작업 완료 시 TaskUpdate로 completed 처리
4. 팀 리드가 코드 리뷰 후 머지 판단

## 브랜치 전략
- `main` ← 배포 가능 (Vercel Production)
- `dev` ← 개발 통합 (Vercel Preview)
- `feat/기능명` ← 기능 브랜치 (에이전트별 worktree)

## Discord 연동
- 주요 컨트롤은 Discord 플러그인으로 원격 제어
- 태스크 상태 변경 시 Discord 채널에 알림 (설정 시)
- 긴 작업은 백그라운드 실행 후 Discord로 완료 알림 수신

## 품질 관리
- 매 기능 완료 시 팀 리드가 코드 리뷰
- P0 기능은 데모 시나리오로 직접 테스트
- AI 퀴즈 품질은 Day 2에 실제 KIT 과정 기반 10개 생성 테스트
