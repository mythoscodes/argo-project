---
type: feature
id: feature-f1-session
related:
  - "[[concept-session]]"
  - "[[concept-join-code]]"
  - "[[concept-academy-isolation]]"
  - "[[feature-f2-quiz-generation]]"
  - "[[role-teacher]]"
  - "[[role-student]]"
  - "[[role-mentor]]"
sources:
  - "src/app/api/sessions/route.ts"
  - "src/app/api/sessions/[id]/route.ts"
  - "src/app/api/sessions/join/route.ts"
  - "supabase/migrations/00001_initial_schema.sql#sessions"
  - "docs/tc/instructor-session-new.md"
  - "docs/tc/instructor-session-detail.md"
updated: 2026-04-11
owner: planner
---

# F1: Session Management (세션 관리)

## Summary

강사가 수업 세션을 생성(draft)→시작(active)→종료(completed)하고, 수강생이 join_code로 입장하는 기능. Argos의 모든 데이터(퀴즈·응답·분석)는 이 세션을 최상위 컨테이너로 한다.

## Key Claims

- `POST /api/sessions`는 Zod `createSessionSchema`로 입력 검증(title 1-200자, subject 1-100자, courseCategory enum, topics 배열, anonymousMode)을 수행한다 — `src/app/api/sessions/route.ts` L105-115
- 상태 전환 허용 테이블: `draft→active` / `active→completed` 만 허용; 역방향 및 `completed→active`는 서버에서 422를 반환한다 — `src/app/api/sessions/[id]/route.ts` L136-148
- `PATCH /api/sessions/[id]`는 `teacher_id = user.id` 소유권 검증을 DB 쿼리 레벨에서 수행한다; RLS `sessions_update_own`과 이중 보호 — `[id]/route.ts` L126, L163
- `DELETE /api/sessions/[id]`는 소유 강사만 가능하며, 세션 삭제 시 sessions → quizzes → responses가 CASCADE 삭제된다 — `migrations/00001` ON DELETE CASCADE 체인
- `GET /api/sessions` 목록에서 mentor는 academy_id 기반 전체 세션, student는 참여 세션만 반환된다; `isStaff = ["owner","teacher","mentor"]` 분기 — `route.ts` L40 전후

## Intuition / Why

KIT 직업훈련 강사는 매 수업마다 새 세션을 만들고 수강생을 입장시키는 흐름을 원한다. draft 상태가 있는 이유는 강사가 미리 세션 설정(과목, 주제)을 저장해 두고, 수업 당일 "시작" 버튼 하나로 join_code를 발급하기 위함이다.

## Details

### API 엔드포인트 목록

| 메서드 | 경로 | 역할 |
|--------|------|------|
| `GET` | `/api/sessions` | 세션 목록 (역할별 분기) |
| `POST` | `/api/sessions` | 세션 생성 (draft) |
| `GET` | `/api/sessions/[id]` | 세션 단건 + 참여자 목록 |
| `PATCH` | `/api/sessions/[id]` | 세션 정보/상태 수정 |
| `DELETE` | `/api/sessions/[id]` | 세션 삭제 |
| `POST` | `/api/sessions/join` | 수강생 참여 (join_code) |

### 상태 전환 다이어그램

```
[draft] ──PATCH status='active'──→ [active] ──PATCH status='completed'──→ [completed]
          join_code 발급                                                    ended_at 기록
          started_at 기록
```

## Connections

- [[concept-session]] — implements: F1이 세션 개념의 전체 CRUD와 상태 전환 구현
- [[concept-join-code]] — implements: F1의 PATCH 로직이 join_code 발급 담당
- [[concept-academy-isolation]] — upstream: F1의 모든 데이터 접근이 academy_id RLS를 따름
- [[feature-f2-quiz-generation]] — downstream: 세션이 active 상태여야 F2 퀴즈 생성 가능
- [[role-teacher]] — upstream: 강사가 F1의 주 사용자 (생성/전환/삭제)
- [[role-student]] — see-also: 수강생은 /api/sessions/join으로 입장
- [[role-mentor]] — see-also: mentor는 academy 전체 세션 읽기 가능

## Gotchas

- **`isTeacher` → `isStaff` 리네임 버그 (T4)**: `GET /api/sessions`에서 초기에 `const isTeacher = ["owner", "teacher"].includes(profile.role)`가 mentor를 포함하지 않아 mentor가 student 분기(참여 세션만)로 떨어졌다. T4에서 `isStaff`로 리네임 및 mentor 포함으로 수정.
- **`GET /api/sessions/[id]`의 mentor `join_code` 노출**: `isTeacher = ["owner", "teacher"]` 체크가 mentor를 제외하므로 mentor가 단건 조회 시 join_code를 받지 못한다 — `[id]/route.ts` L56. mentor가 join_code를 볼 필요가 있는지 정책 결정 필요 (현재는 노출 안 됨).

## Changelog

- 2026-04-11 — 초판 작성 (planner)
