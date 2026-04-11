---
type: lib
id: lib-supabase-rsc
related:
  - "[[lib-supabase-server]]"
  - "[[lib-supabase-middleware]]"
  - "[[rls-profiles]]"
sources:
  - "src/lib/supabase/rsc.ts"
  - "src/lib/supabase/server.ts"
  - "CLAUDE.md#React-/-Next.js-패턴"
updated: 2026-04-11
owner: analyst-2
---

# lib-supabase-rsc — Server Component 전용 Supabase 클라이언트

## Summary

`src/lib/supabase/rsc.ts` — Server Component에서 DB 직접 쿼리에 사용하는 read-only Supabase 클라이언트. `server.ts`와 구조는 동일하나 용도가 Server Component 전용임을 파일명으로 명시.

## Key Claims

- `rsc.ts`는 `server.ts`와 동일하게 `getAll`만 구현하고 `setAll`은 미구현이다.
- 두 파일의 차이는 **용도 구분**: `rsc.ts`는 Server Component, `server.ts`는 Route Handler — 코드는 동일하나 파일 분리로 import 추적이 명확해진다.
- Server Component는 Next.js 제약으로 `response.cookies.set()` 호출이 불가 → `setAll` 구현 시 런타임 에러.
- 코드 주석: "Route Handler용은 server.ts 사용 — setAll이 필요한 경우 반드시 server.ts로."

## Intuition / Why

CLAUDE.md 아키텍처 원칙 "Server Components 기본 — 데이터 페칭은 Server Components에서 Supabase 직접 쿼리(RSC 패턴)". 이 원칙을 따르는 Server Component들이 import할 전용 파일. Route Handler의 `server.ts`와 혼용하면 "이 파일이 어디서 쓰이는가"를 grep하기 어려워진다.

## Details

```ts
// rsc.ts (핵심 발췌)
// Server Component 전용 클라이언트 (Context7 /supabase/ssr Pattern 3)
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(URL, KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      // setAll 생략 — Server Component는 read-only
    },
  });
}
```

Server Component에서의 일반 사용 패턴: `const supabase = await createClient(); const { data } = await supabase.from("sessions").select("*")`.

## Connections

- [[lib-supabase-server]] — sibling: Route Handler 전용 클라이언트. 코드 동일, 용도만 다름
- [[lib-supabase-middleware]] — sibling: setAll 구현체. 세션 리프레시 전담
- [[rls-profiles]] — downstream: Server Component가 이 클라이언트로 profiles 쿼리 시 RLS 통과

## Gotchas

- **`rsc.ts`와 `server.ts` 혼용 금지**: Server Component에서 `server.ts`를 import해도 동작하지만, grep으로 "어디서 Route Handler 클라이언트 쓰나"를 추적할 때 혼선. 파일명으로 용도 경계를 지킬 것.
- **`await cookies()`**: Next.js 15+에서 `cookies()`가 비동기화되어 `await`이 필요. 누락 시 타입 에러.

## Changelog

- 2026-04-11 — 초판 작성 (analyst-2). `server.ts`에서 Server Component 전용으로 분리.
