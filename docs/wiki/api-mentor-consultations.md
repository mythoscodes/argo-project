---
type: api
id: api-mentor-consultations
related:
  - "[[rls-consultation-notes]]"
  - "[[api-mentor-students-id]]"
  - "[[screen-mentor-student-detail]]"
  - "[[role-mentor]]"
sources:
  - "src/app/api/mentor/consultations/route.ts"
  - "docs/scrum/dev-changelog.md#T4"
  - "docs/tc/mentor-student-detail.md#MSD-API-002"
updated: 2026-04-11
owner: analyst-2
---

# api-mentor-consultations — GET/POST /api/mentor/consultations

## Summary

멘토/강사의 수강생 상담 기록 조회(GET)와 생성(POST)을 처리하는 Route Handler. `consultation_notes` 테이블 기반. T4에서 mentor role 허용 추가.

## Key Claims

- GET: `?studentId` 파라미터로 특정 수강생의 상담 기록 조회. 응답은 flat array.
- POST: `{ studentId, type, content, nextConsultationDate? }` — `content` 빈값 시 `400` (Zod 검증).
- `type` enum: `학습부진 | 진로 | 출결 | 기타` — Zod 검증.
- 인가: `get_my_role() IN ('owner', 'teacher', 'mentor')` — T4에서 mentor 추가.
- RLS INSERT: `instructor_id = auth.uid() AND academy_id = get_my_academy_id() AND get_my_role() IN ('owner', 'teacher', 'mentor')` (00007 복원).

## Intuition / Why

멘토가 상담 후 기록을 남겨야 다음 상담 전 이력을 볼 수 있다. GET은 본인 기록 조회, POST는 새 기록 추가. RLS가 academy_id + role로 격리.

## Details

응답 형태: `snake_case flat array` — 프론트 `ConsultationNote[]` 타입과 일치.

`nextConsultationDate`: optional — DB에 `next_consultation_date` 컬럼. 과거 날짜도 서버가 허용 (클라이언트 UX 판단).

## Connections

- [[rls-consultation-notes]] — upstream: INSERT/SELECT RLS (00007 복원)
- [[api-mentor-students-id]] — sibling: 수강생 상세 API와 함께 상담 상세 화면에서 병렬 호출
- [[screen-mentor-student-detail]] — downstream: 상담 기록 CRUD UI
- [[role-mentor]] — see-also: T4에서 mentor 허용 추가

## Gotchas

- **00006 회귀 영향**: 00006에서 RLS INSERT role 체크가 빠져 student가 삽입 가능했다. 00007에서 복원 — API 레벨 role 체크 + RLS 이중 보호.
- **GET studentId 누락**: `?studentId` 없이 GET 시 전체 조회 또는 400 — 정책 확인 필요. 전체 조회면 RLS가 학원 내 본인 기록만 반환.
- **silent failure on POST 500**: 현재 저장 실패 시 다이얼로그 유지, 에러 미표시. MSD-ERR-004.

## Changelog

- 2026-04-11 — T4: mentor role 허용, GET/POST 응답 flat array 변환
- 초기 — owner/teacher 전용 상담 기록 API
