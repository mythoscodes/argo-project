---
type: feature
id: feature-f9-sharing
related:
  - "[[concept-risk-signal]]"
  - "[[lib-ai-prompts]]"
  - "[[lib-ai-schemas]]"
  - "[[feature-f8-owner-dashboard]]"
  - "[[role-mentor]]"
  - "[[role-owner]]"
sources:
  - "src/app/api/ai/mentor-briefing/route.ts"
  - "src/lib/ai/prompts/mentor-briefing.ts"
  - "src/lib/ai/schemas/mentor-briefing.ts"
  - "supabase/migrations/00002_mentor_tables.sql"
updated: 2026-04-11
owner: planner
---

# F9: Mentor Briefing & Sharing (멘토 브리핑 및 공유)

## Summary

AI가 수강생의 위험 신호·학습 이력을 요약해 멘토가 상담 전 빠르게 파악할 수 있는 브리핑을 생성하고, 상담 결과를 `consultation_notes`에 기록하는 기능. `POST /api/ai/mentor-briefing`이 핵심 엔드포인트.

## Key Claims

- `POST /api/ai/mentor-briefing`은 `mentor/owner` role에 허용된다
- AI 브리핑은 수강생의 위험 신호 3종(정답률·속도·출석), 약점 토픽, 최근 세션 이력을 컨텍스트로 사용한다
- `consultation_notes` INSERT는 `instructor_id = auth.uid() AND academy_id = get_my_academy_id() AND role IN ('owner', 'teacher', 'mentor')`로 보호된다 — `migrations/00007_add_mentor_role.sql` L15-21
- mentor는 `consultation_notes` SELECT 시 학원 전체 상담 기록을 조회할 수 있다 (owner와 동급) — `migrations/00007` L28-34

## Intuition / Why

멘토는 한 번에 여러 수강생을 상담해야 한다. 상담 전 각 수강생의 학습 상태를 수동으로 조회하면 10분 이상 소요된다. AI 브리핑이 1~2분 안에 "상담 포인트"를 제공해 상담의 질과 효율을 동시에 높인다.

## Connections

- [[concept-risk-signal]] — upstream: 위험 신호 데이터가 브리핑 입력 컨텍스트
- [[lib-ai-prompts]] — uses: `mentor-briefing.ts`의 프롬프트 빌더
- [[lib-ai-schemas]] — uses: `mentor-briefing.ts`의 Zod 스키마
- [[feature-f8-owner-dashboard]] — upstream: F8에서 위험 수강생을 식별 후 F9 브리핑 생성 흐름
- [[role-mentor]] — upstream: mentor가 F9의 주 사용자
- [[role-owner]] — see-also: owner도 브리핑 생성 가능

## Gotchas

- **consultation_notes 00006 회귀 → 00007 복원**: 00006 마이그레이션에서 `consultation_notes_insert` RLS의 role 체크가 제거되어 수강생도 상담 기록을 생성할 수 있었다. 00007에서 `get_my_role() IN ('owner', 'teacher', 'mentor')` 조건 복원 — `migrations/00007` L13-21.

## Changelog

- 2026-04-11 — 초판 작성 (planner)
