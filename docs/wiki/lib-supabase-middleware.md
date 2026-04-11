---
type: lib
id: lib-supabase-middleware
related:
  - "[[lib-supabase-server]]"
  - "[[lib-supabase-rsc]]"
  - "[[rls-profiles]]"
  - "[[screen-login]]"
sources:
  - "src/lib/supabase/middleware.ts"
  - "src/middleware.ts"
  - "CLAUDE.md#아키텍처"
updated: 2026-04-11
owner: analyst-2
---

# lib-supabase-middleware — 세션 리프레시 전담 미들웨어 클라이언트

## Summary

Next.js Edge Middleware에서 실행되는 Supabase 클라이언트. `getAll` + `setAll`을 모두 구현하여 JWT 토큰 리프레시를 처리하고, 미인증 요청을 `/login`으로 리다이렉트한다.

## Key Claims

- `updateSession()`은 `getAll` + `setAll`을 모두 구현한 유일한 Supabase 클라이언트다. `server.ts`와 `rsc.ts`는 `setAll` 미구현.
- `setAll`에서 `request.cookies.set()`과 `supabaseResponse.cookies.set()` 두 곳에 모두 쿠키를 쓴다 — 미들웨어 체인과 응답 모두에 반영하기 위함.
- 미인증 사용자는 공개 경로(`/login`, `/register`) 및 `/api/` 이하를 제외하고 모두 `/login`으로 리다이렉트된다.
- 인증된 사용자가 `/login`이나 `/register`에 접근하면 `/`으로 리다이렉트된다.
- `PUBLIC_PATHS = ["/login", "/register"]` — 이 배열이 미들웨어 공개/비공개 분기의 SSoT다.

## Intuition / Why

Next.js App Router에서 Supabase 세션(JWT)은 쿠키로 관리된다. JWT 만료 시 Supabase SSR 라이브러리가 자동 리프레시를 시도하는데, 새 토큰을 쿠키에 **쓰는** 동작(`setAll`)이 필요하다. Server Component는 Next.js 제약상 응답 쿠키를 쓸 수 없으므로, 세션 리프레시는 미들웨어(Edge Function)에서만 가능하다.

모든 요청은 미들웨어를 먼저 통과하므로, 여기서 리프레시 후 후속 Server Component/Route Handler는 이미 갱신된 쿠키를 읽기만 하면 된다.

## Details

```ts
// 핵심 setAll 패턴
setAll(cookiesToSet) {
  cookiesToSet.forEach(({ name, value }) =>
    request.cookies.set(name, value)       // 1) 요청 체인에 반영
  );
  supabaseResponse = NextResponse.next({ request });
  cookiesToSet.forEach(({ name, value, options }) =>
    supabaseResponse.cookies.set(name, value, options)  // 2) 응답에 반영
  );
},
```

`supabaseResponse`를 재할당하는 이유: `NextResponse.next({ request })`에 업데이트된 요청을 담아야 다음 미들웨어/Server Component가 갱신된 쿠키를 본다.

## Connections

- [[lib-supabase-server]] — sibling: Route Handler용 클라이언트. setAll 없음 — 이 파일이 그 역할을 대신
- [[lib-supabase-rsc]] — sibling: Server Component용 클라이언트. 동일하게 read-only
- [[rls-profiles]] — downstream: 미들웨어가 `supabase.auth.getUser()`로 인증 확인 시 profiles RLS 통과
- [[screen-login]] — downstream: 미인증 사용자를 이 화면으로 리다이렉트

## Gotchas

- **`supabaseResponse` 반드시 반환**: `NextResponse.next()` 새 응답을 생성하면서 원래 `supabaseResponse`를 덮어쓴다. 미들웨어 마지막에 `return supabaseResponse`가 없으면 쿠키가 클라이언트에 전달되지 않는다.
- **API 경로 리다이렉트 예외**: `isApi = pathname.startsWith("/api")`로 API Route는 미들웨어 리다이렉트에서 제외 — API는 각자 `auth.getUser()`로 인가. 미인증 API 요청은 `401`을 반환해야 하지만 현재는 각 Route Handler 의존.
- **`PUBLIC_PATHS` 확장 시 주의**: `/reset-password`, `/verify` 등 추가 공개 경로 생성 시 이 배열에 추가해야 한다. 누락 시 미인증 사용자가 접근 불가.

## Changelog

- 2026-04-11 — 현재 형태 (T4 이전부터 존재, T14-Patch2에서 server.ts setAll 제거와 함께 미들웨어의 세션 리프레시 전담 역할 명확화)
