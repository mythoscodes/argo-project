---
type: lib
id: lib-supabase-server
related:
  - "[[lib-supabase-middleware]]"
  - "[[lib-supabase-rsc]]"
  - "[[lib-supabase-client]]"
  - "[[rls-profiles]]"
  - "[[api-sessions]]"
sources:
  - "src/lib/supabase/server.ts"
  - "src/lib/supabase/middleware.ts"
  - "docs/scrum/dev-changelog.md#T14-Patch2"
  - "CLAUDE.md#아키텍처"
updated: 2026-04-11
owner: analyst-2
---

# lib-supabase-server — Server Component / Route Handler 클라이언트

## Summary

Next.js App Router의 Server Component 및 API Route Handler에서 Supabase에 접근하는 `createClient()` 팩토리. `getAll`만 구현하고 `setAll`은 의도적으로 미구현 — 세션 리프레시는 `middleware.ts`가 전담한다.

## Key Claims

- `createClient()`는 `cookies.getAll()`만 구현한다. `setAll`은 코드에 존재하지 않는다. (`src/lib/supabase/server.ts` 전체 확인)
- 모든 API Route는 `supabase.auth.getUser()`만 호출하며, `auth.updateUser` / `signOut` / `refreshSession` / `setSession`은 호출하지 않는다. (`grep -r "refreshSession\|updateUser" src/app/api/` 결과 0건)
- 세션 토큰 리프레시는 `middleware.ts`의 독립 `createServerClient` + 완전한 `setAll`이 전담한다.
- Server Component에서 `setAll`을 호출하면 Next.js가 readonly cookies 에러를 던진다 — 이 제약이 `setAll` 미구현의 근거.

## Intuition / Why

Supabase SSR 공식 패턴(`@supabase/ssr`)은 두 클라이언트를 분리한다: ① middleware가 토큰 리프레시를 담당(read+write), ② Server Component/Route Handler는 읽기 전용(read-only). Next.js의 Server Component에서 `response.cookies.set()`을 호출하면 에러가 발생하므로, `setAll`을 Server Component 클라이언트에 두면 세션 리프레시 시도 시 런타임 에러가 난다.

T14-Patch2 이전에는 `setAll`에 빈 try/catch가 있었는데, 이는 에러를 억제하는 안티패턴이었다. critic-2 검증 후 `setAll` 블록 자체를 제거하고 의도 주석을 추가했다.

## Details

```ts
// src/lib/supabase/server.ts (핵심 발췌)
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(URL, KEY, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      // setAll 미구현: middleware.ts가 전담
    },
  });
}
```

Route Handler가 이 클라이언트로 세션 리프레시 이상의 auth 조작(signOut 등)이 필요해지면, `setAll`을 다시 구현해야 한다. Context7 `/supabase/ssr` Pattern 1/2 참조.

## Connections

- [[lib-supabase-middleware]] — sibling: setAll + 세션 리프레시 구현이 이 파일에 있음. server.ts가 하지 않는 일을 middleware.ts가 담당
- [[lib-supabase-rsc]] — sibling: Server Component 전용 factory. T14-Patch2에서 신규 생성. server.ts는 Route Handler용, rsc.ts는 Server Component용으로 역할 분리
- [[lib-supabase-client]] — sibling: 브라우저(클라이언트 컴포넌트) 전용 `createBrowserClient` 래퍼
- [[rls-profiles]] — downstream: 이 클라이언트로 profiles 테이블 RLS를 통과하는 모든 쿼리 실행
- [[api-sessions]] — downstream: Route Handler가 이 `createClient()`를 import하여 세션 CRUD

## Gotchas

- **T14-Patch2**: 원래 `setAll`에 빈 `try/catch` 블록이 있었다. 에러를 조용히 삼키는 안티패턴 — 실제로 에러가 발생해도 숨겨진다. critic-2 검증 후 전체 블록 제거.
- **Route Handler에 auth.signOut 추가 시 주의**: `setAll` 없이 `auth.signOut()`을 호출하면 쿠키 삭제가 응답에 반영되지 않아 클라이언트에 구 세션이 남는다. 이 경우 `setAll` 재구현 필요.
- **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`**: Cycle 1 이전엔 `NEXT_PUBLIC_SUPABASE_ANON_KEY`였다. 마이그레이션 `00006` 시점에 키 이름 변경. `.env.local`과 함께 확인 필요.

## Changelog

- 2026-04-11 — T14-Patch2: `setAll` 빈 블록 제거 + 의도 주석 추가. critic-2 GO. (analyst-2 작성)
