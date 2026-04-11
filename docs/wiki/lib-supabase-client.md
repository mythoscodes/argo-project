---
type: lib
id: lib-supabase-client
related:
  - "[[lib-supabase-server]]"
  - "[[lib-supabase-rsc]]"
  - "[[lib-supabase-middleware]]"
  - "[[hook-use-realtime]]"
sources:
  - "src/lib/supabase/client.ts"
  - "CLAUDE.md#아키텍처"
updated: 2026-04-11
owner: analyst-2
---

# lib-supabase-client — 브라우저 클라이언트

## Summary

클라이언트 컴포넌트(`'use client'`)에서 Supabase에 접근하는 `createBrowserClient` 래퍼. 9줄짜리 단순 팩토리.

## Key Claims

- `createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)` — 브라우저 전용.
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 두 환경변수만 사용.
- 서버사이드 코드(`src/app/api/**`)에서 이 파일을 import하면 빌드 경고 발생 가능 — 서버에서는 `server.ts` 또는 `rsc.ts` 사용.
- 실시간 구독(`hook-use-realtime.ts`)에서만 클라이언트 인스턴스가 필요 — 나머지 '`use client'` 컴포넌트는 fetch API 경유.

## Intuition / Why

Next.js App Router에서 클라이언트 컴포넌트는 브라우저에서 실행되므로 서버 쿠키에 접근할 수 없다. `createBrowserClient`는 로컬 스토리지/쿠키를 브라우저 네이티브로 관리.

CLAUDE.md 규칙 10: "클라이언트에서 `supabase.from()` 직접 호출은 읽기 전용 + RLS 보호 하에만" — 이 클라이언트를 통한 쓰기 조작은 금지.

## Details

```ts
// src/lib/supabase/client.ts
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
```

`!` non-null assertion — 환경변수 미설정 시 런타임 에러. `.env.local`에 두 키 필수.

## Connections

- [[lib-supabase-server]] — sibling: Route Handler 전용. 이 파일은 브라우저 전용
- [[lib-supabase-rsc]] — sibling: Server Component 전용. 세 파일이 역할 분리
- [[lib-supabase-middleware]] — sibling: JWT 리프레시 전용. setAll 구현
- [[hook-use-realtime]] — downstream: 유일한 클라이언트 컴포넌트 Supabase 소비자

## Gotchas

- **NEXT_PUBLIC_ 접두사 필수**: `SUPABASE_URL`과 `SUPABASE_PUBLISHABLE_KEY`에만 `NEXT_PUBLIC_` 허용. 다른 키(AI API키 등)에 `NEXT_PUBLIC_` 붙이면 보안 위반 (CLAUDE.md 규칙 2).
- **Realtime 전용 사용처**: 현재 코드베이스에서 이 클라이언트를 직접 쓰는 곳은 `hook-use-realtime.ts`뿐. 클라이언트 컴포넌트 → API Route 호출(fetch)이 기본 패턴.

## Changelog

- 초기 — createBrowserClient 래퍼 생성 (9줄)
