# Argos Wiki Schema

> Karpathy Wiki 패턴 (gist 442a6bf)을 Argos 프로젝트에 맞춰 스키마화. 이 문서는 `docs/wiki/` 하위 모든 페이지의 **Single Source of Truth** 이다.
>
> 작성: team-lead · 2026-04-11
> 참조: [Karpathy LLM Wiki Pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)

---

## 1. 3층 구조

| 층 | 위치 | 특성 |
|---|------|------|
| **Raw sources** (불변) | `CLAUDE.md`, `docs/PLANNING.md`, `docs/MEETING_LOG.md`, `docs/tc/*.md`, `supabase/migrations/*.sql`, `src/**` | 수정 금지. Wiki가 읽어서 요약 대상 |
| **Wiki** (생성) | `docs/wiki/` | LLM이 작성/갱신하는 요약·개념·Connection 페이지 |
| **Schema** (규칙) | 본 문서 (`docs/wiki/SCHEMA.md`) + `docs/wiki/README.md` | 페이지 구조·파일명·링크 규칙 |

Wiki는 **원본을 대체하지 않는다**. 원본의 내용을 코드 복사하지 말고, **요약·직관·연결·주의점**을 기록한다.

---

## 2. 파일명 규칙

`docs/wiki/{category}-{slug}.md`

- **kebab-case**
- 언더스코어/대문자 금지
- slug는 내용 축약 (긴 접두사 금지)

### 카테고리 표

| 카테고리 | 대상 | 예시 파일명 |
|---------|-----|-----------|
| `concept-*` | 도메인 개념 | `concept-session.md`, `concept-understanding-score.md`, `concept-risk-signal.md` |
| `feature-f{n}-*` | F1~F9 기능 | `feature-f1-session.md`, `feature-f2-quiz-generation.md`, `feature-f4-heatmap.md` |
| `role-*` | 사용자 역할 | `role-teacher.md`, `role-student.md`, `role-mentor.md`, `role-owner.md` |
| `screen-*` | 화면 (App Router route) | `screen-common-home.md`, `screen-instructor-session-detail.md` |
| `api-*` | API Route | `api-auth-register.md`, `api-sessions.md`, `api-ai-quiz.md` |
| `component-*` | 주요 UI 컴포넌트 | `component-understanding-heatmap.md`, `component-delta-chart.md` |
| `hook-*` | React hooks | `hook-use-realtime.md` |
| `lib-*` | `src/lib/**` 모듈 | `lib-supabase-server.md`, `lib-supabase-middleware.md`, `lib-ai-prompts.md`, `lib-ai-schemas.md`, `lib-constants.md` |
| `rls-*` | RLS 정책/테이블 보안 | `rls-profiles.md`, `rls-sessions.md`, `rls-consultation-notes.md` |
| `test-*` | 테스트 전략 | `test-e2e-strategy.md`, `test-ai-mocking.md` |
| `process-*` | 개발 프로세스 | `process-cycle-scrum.md`, `process-qa-regression.md` |

### 카테고리 할당 원칙

- **하나의 주제 = 하나의 카테고리**. 애매하면 `concept-*`로.
- 화면(`screen-*`)과 기능(`feature-*`)은 중복 가능: 화면은 UI 중심, 기능은 end-to-end 플로우 중심.
- 개별 TC(`docs/tc/*.md`의 테이블 행)는 **wiki 페이지로 만들지 않는다**. TC 목록은 해당 `screen-*` wiki에서 [[link]]로 원본 `docs/tc/` 파일을 참조한다.

---

## 3. 페이지 템플릿

```markdown
---
type: concept | feature | role | screen | api | component | hook | lib | rls | test | process
id: {파일명에서 .md 제외 — 예: concept-session}
related:
  - "[[concept-xxx]]"
  - "[[screen-yyy]]"
sources:
  - "CLAUDE.md#..."
  - "src/app/api/sessions/route.ts"
  - "docs/tc/instructor-session-detail.md"
updated: 2026-04-11
owner: planner | analyst-2 | team-lead
---

# {Title} (한국어 가능)

## Summary

한 단락. 이 개념/기능/모듈이 **무엇이고 왜 존재하는지**. 50-120자.

## Key Claims

> **falsifiable 주장만**. "좋다" "잘 동작한다" 같은 소프트 주장 금지.

- 주장 1 — 검증 가능한 사실. 필요 시 sources에 근거 링크.
- 주장 2 — ...

## Intuition / Why

한 단락~여러 단락. 설계 동기, 대안과 비교, 왜 이 선택을 했는지.
Argos 컨텍스트 (KIT 성인 직업훈련, 2026 공모전, F1-F9 우선순위 등) 가 결정에 어떻게 영향을 줬는지 있다면 명시.

## Details

핵심 메커니즘. 한두 단락 + (있다면) mini 예시 코드 블록.
**원본 코드 전체 복사 금지** — 핵심 발췌 또는 요약만.

## Connections

다른 wiki 페이지와의 관계를 명시적으로 나열.

- [[related-page-1]] — 어떤 관계인지 한 줄 (upstream / downstream / sibling / contradicts)
- [[related-page-2]] — ...

**양방향 원칙**: A 페이지에서 [[B]]를 걸었으면, B 페이지의 Connections에도 [[A]]가 있어야 한다. 누락 시 역참조 누락으로 간주.

## Gotchas

함정·주의점·과거 버그 기록. 실전 경험만. 가설 금지.

- Gotcha 1 — 언제·왜·어떻게 피하는지
- ...

## Contradictions

(있을 때만 섹션 유지. 없으면 섹션 삭제 가능)

다른 wiki 페이지나 raw source와 상충하는 지점을 **의식적으로 기록**. 해결 전이면 `UNRESOLVED:` 접두사.

- [[other-page]] — 어떤 점에서 충돌하는지. 해결 상태.

## Changelog

- 2026-04-11 — 초판 작성 (owner)
- YYYY-MM-DD — ...
```

### 템플릿 규칙

1. **Frontmatter 필수**: type, id, related, sources, updated, owner
2. **Summary는 첫 줄 검색 가능하도록** 중요한 키워드 포함
3. **Key Claims는 모두 falsifiable** — "잘 동작한다" 금지, "Server Component에서 setAll을 호출하면 Next.js가 readonly 에러를 던진다" OK
4. **Details는 짧게** — 400자 이내. 더 필요하면 별도 하위 페이지로 분리
5. **Connections의 [[link]] 는 실제 파일명과 정확히 일치** (확장자 없이): `[[concept-session]]` → `docs/wiki/concept-session.md`
6. **양방향 링크 위반 금지** — Connections 작성 시 반대편 페이지도 업데이트
7. **Gotchas는 실전 경험만** — 가상 케이스 금지, 실제 발생한 이슈만

---

## 4. Wikilink 규약

Markdown 표준에는 `[[link]]` 문법이 없지만, 본 프로젝트에서는 **관례적 마커**로 사용한다.

- `[[page-name]]` — wiki 내부 다른 페이지. 확장자 `.md` 생략.
- `[[page-name#섹션]]` — 특정 섹션 앵커.
- `[[path/to/file.ts]]` — raw source 파일 참조. 상대 경로 (프로젝트 루트 기준).
- `[[docs/tc/screen-xxx.md]]` — 기존 TC 문서 참조.
- 일반 외부 링크는 `[text](url)` 표준 markdown.

**링크 검증**: `docs/wiki/README.md` 에 모든 페이지 인덱스 유지. 링크 깨짐은 grep으로 주기 점검.

---

## 5. Connections 분류 태그 (권장)

Connections 항목에 관계 유형을 한 단어로 명시:

| 태그 | 의미 |
|------|------|
| `upstream` | A가 B에 의존함 (B가 먼저) |
| `downstream` | B가 A에 의존함 |
| `sibling` | 같은 카테고리/계층 |
| `implements` | A가 B의 구현 (screen이 feature를 implements) |
| `uses` | A가 B를 사용 (컴포넌트가 훅을 uses) |
| `contradicts` | 명시적 충돌 |
| `see-also` | 관련 있으나 직접 의존 아님 |

예시:
```
- [[feature-f2-quiz-generation]] — implements: 이 화면이 F2의 UI 관문
- [[lib-ai-prompts]] — upstream: 프롬프트 파일이 이 화면의 퀴즈 생성 결과를 결정
- [[concept-session]] — uses: 이 화면은 session 개념을 조작
```

---

## 6. 코드 주석 규약 (`@wiki`)

주요 코드 파일 상단(파일 docstring)에 `@wiki` 태그로 wiki 페이지를 역참조한다. 양방향 탐색을 돕기 위함.

```ts
/**
 * @wiki api-sessions
 * @wiki feature-f1-session
 *
 * POST /api/sessions — 세션 생성. teacher role + academy_id 자동 바인딩.
 */
```

적용 대상:
- `src/app/api/**/route.ts` — `@wiki api-*`
- `src/components/{heatmap,charts}/**` — `@wiki component-*`
- `src/hooks/use-realtime.ts` — `@wiki hook-use-realtime`
- `src/lib/supabase/*.ts`, `src/lib/ai/**` — `@wiki lib-*`
- `src/app/page.tsx`, `src/app/*/layout.tsx` — `@wiki screen-*`, `@wiki role-*` (layout는 role)

**코드 본문 주석에는 `@wiki` 사용 금지**. 파일 상단 JSDoc에만.

---

## 7. 작성 워크플로

### 신규 페이지 작성
1. Raw source를 Read → 핵심 발췌
2. 파일명 규칙에 맞춰 `docs/wiki/{category}-{slug}.md` 생성
3. 템플릿 구조로 작성 — Summary부터 Changelog까지
4. Connections에 기입한 모든 [[link]]의 반대편 페이지 업데이트 (양방향)
5. `docs/wiki/README.md` 인덱스에 추가

### 기존 페이지 갱신
1. 원본이 변경되면 (예: `src/app/api/sessions/route.ts` 수정) 해당 `api-sessions.md` 의 Changelog에 1줄 추가
2. Key Claims / Details에 영향이 있으면 섹션 업데이트
3. 새로운 Gotcha 발견 시 즉시 추가
4. Contradictions 발견 시 즉시 기록 (해결 전이라도)

### 모순 발견 시
- Contradictions 섹션에 `UNRESOLVED:` 접두사로 기록
- 해결되면 Changelog에 해결 날짜 기록 후 UNRESOLVED 태그 제거

---

## 8. 금지 사항

1. **원본 코드 덩어리 복사** — 요약/발췌만
2. **가설/추측 Gotcha** — 실제 발생한 경험만
3. **일반 개발자 지식 반복** — "Next.js App Router는 RSC를 사용한다" 같은 내용 금지 (raw source에 없는 Argos-특화 내용만)
4. **단방향 링크** — Connections 작성 시 반드시 반대편 업데이트
5. **Raw source 수정** — Wiki는 읽기만, 원본 변경은 별도 태스크
6. **파일명 카테고리 위반** — 애매하면 concept-* 사용
7. **너무 긴 페이지** — 500줄 초과 시 하위 페이지 분리
8. **빈 섹션 유지** — Contradictions 등 해당 없으면 섹션 자체 삭제

---

## 9. 검증 체크리스트

새 페이지 또는 갱신 시:

- [ ] frontmatter 6개 필드 모두 채움
- [ ] Summary 50-120자
- [ ] Key Claims 모두 falsifiable
- [ ] Connections의 각 [[link]] 반대편 페이지 존재 + 역참조 있음
- [ ] Gotchas는 실제 경험만
- [ ] sources 필드에 근거 파일/문서 명시
- [ ] README.md 인덱스에 추가됨
- [ ] 길이 500줄 이하
- [ ] 중복 내용 없음 (기존 페이지와)

---

## 10. 첫 페이지 우선순위 (Cycle 2 병렬 작업)

**planner 담당** (concept/feature/role, 약 30-40 페이지):
- `concept-session.md`
- `concept-quiz.md`
- `concept-understanding-score.md`
- `concept-heatmap.md`
- `concept-risk-signal.md`
- `concept-join-code.md`
- `concept-academy-isolation.md`
- `feature-f1-session.md`
- `feature-f2-quiz-generation.md`
- `feature-f3-response-collection.md`
- `feature-f4-heatmap.md`
- `feature-f5-ai-coaching.md`
- `feature-f6-feedback-loop.md`
- `feature-f7-report.md`
- `feature-f8-owner-dashboard.md`
- `feature-f9-sharing.md`
- `role-teacher.md`
- `role-student.md`
- `role-mentor.md`
- `role-owner.md`

**analyst-2 담당** (screen/api/component/hook/lib/rls, 약 60-80 페이지):
- `screen-*` 14개 (docs/tc/*.md 각각에 대응)
- `api-*` 각 API route 요약 (약 18개)
- `component-understanding-heatmap.md`, `component-delta-chart.md`
- `hook-use-realtime.md`
- `lib-supabase-server.md`, `lib-supabase-rsc.md`, `lib-supabase-middleware.md`
- `lib-ai-prompts.md`, `lib-ai-schemas.md`, `lib-ai-model.md`
- `lib-constants.md`
- `rls-*` 주요 테이블별 RLS 요약

**dev-2 담당** (코드 주석 `@wiki` 삽입, 병렬 소형 작업):
- 위 페이지들이 `planner`/`analyst-2` 에 의해 작성된 순서대로, 해당 원본 코드 파일 상단에 `@wiki` 주석 추가
- 범위: `src/app/api/**`, `src/components/{heatmap,charts}/**`, `src/hooks/**`, `src/lib/**`, `src/app/page.tsx`, `src/app/*/layout.tsx`

---

## 11. 완료 정의 (Definition of Done for Wiki)

- `docs/wiki/README.md` 인덱스에 최소 90개 페이지 등록
- 모든 페이지가 템플릿 10개 섹션 중 해당하는 것들 작성 (Contradictions 선택)
- 양방향 링크 자동 검증 스크립트 또는 수동 grep 결과 0 orphan
- `src/app/api/**/route.ts` 18개 전부 `@wiki` 주석 포함
- `src/lib/supabase/*.ts`, `src/lib/ai/**` 전부 `@wiki` 주석 포함
- 본 `SCHEMA.md`가 Raw source로 링크되어 모든 페이지의 sources에 등장
