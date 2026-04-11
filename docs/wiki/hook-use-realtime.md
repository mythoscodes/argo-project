---
type: hook
id: hook-use-realtime
related:
  - "[[lib-supabase-rsc]]"
  - "[[feature-f3-response-collection]]"
  - "[[feature-f4-heatmap]]"
  - "[[screen-instructor-session-detail]]"
  - "[[screen-student-session]]"
sources:
  - "src/hooks/use-realtime.ts"
  - "docs/scrum/dev-changelog.md#T4"
  - "docs/tc/student-session.md#SSN-RT"
updated: 2026-04-11
owner: analyst-2
---

# hook-use-realtime — Supabase Realtime 구독 훅

## Summary

`responses` 테이블의 실시간 INSERT를 Supabase Realtime으로 구독하는 클라이언트 훅. 초기 로드 + 신규 응답 스트리밍 + CHANNEL_ERROR/TIMED_OUT 에러 상태를 반환한다.

## Key Claims

- 반환 타입은 `{ responses: ResponseRow[], isConnected: boolean, error: string | null }` — `error` 필드는 T4에서 추가 (이전엔 없음).
- CHANNEL_ERROR 또는 TIMED_OUT 발생 시 `isConnected = false`, `error = "실시간 연결 실패: {status}"` 로 상태가 전환된다.
- 신규 응답 INSERT 시 중복 방지 로직: `prev.some((r) => r.id === payload.new.id)`가 true이면 상태 업데이트를 건너뛴다.
- `sessionId`가 없으면 `useEffect`가 early return — 구독 시작하지 않음.
- 채널 이름: `responses:session_id=eq.{sessionId}` — filter와 채널 이름이 모두 세션 ID로 범위 제한.

## Intuition / Why

F3(수강생 응답)과 F4(히트맵)는 강사 화면이 수강생 응답을 실시간으로 받아야 한다. Supabase Realtime `postgres_changes`로 INSERT 이벤트를 구독하면 polling 없이 push 방식 수신이 가능하다.

T4 이전에는 `loadExisting()`에서 `{ data }` 만 destructure하여 `fetchError`를 무시했다 (silent failure). 또한 `subscribe` 콜백에서 CHANNEL_ERROR/TIMED_OUT 처리가 없어 연결 실패 시 클라이언트는 `isConnected = false`만 알 수 있었다. T4에서 두 가지 모두 수정.

## Details

```ts
// 핵심 구조 (발췌)
const { data, error: fetchError } = await supabase.current
  .from("responses").select("*").eq("session_id", sessionId);
if (fetchError) { setError(fetchError.message); return; }

const channel = supabase.current
  .channel(`responses:session_id=eq.${sessionId}`)
  .on("postgres_changes", { event: "INSERT", filter: `session_id=eq.${sessionId}` },
    (payload) => {
      setResponses(prev => {
        const exists = prev.some(r => r.id === payload.new.id);
        return exists ? prev : [...prev, payload.new];
      });
    })
  .subscribe(status => {
    if (status === "SUBSCRIBED") { setIsConnected(true); setError(null); }
    else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      setIsConnected(false); setError(`실시간 연결 실패: ${status}`);
    } else { setIsConnected(false); }
  });

return () => { channel.unsubscribe(); };
```

`useRef(createClient())`로 클라이언트를 ref에 저장 — 리렌더링 시 새 클라이언트 생성 방지.

## Connections

- [[lib-supabase-rsc]] — upstream: 브라우저 클라이언트(`createBrowserClient`)를 사용 (`src/lib/supabase/client.ts`)
- [[feature-f3-response-collection]] — implements: F3의 실시간 응답 수신 UI 측 구현
- [[feature-f4-heatmap]] — downstream: 히트맵이 이 훅의 `responses`를 집계하여 이해도 계산
- [[screen-instructor-session-detail]] — uses: 강사 세션 상세 화면이 이 훅으로 실시간 응답 수신
- [[screen-student-session]] — see-also: 수강생 세션 화면도 동일 훅 또는 유사 패턴 사용 가능성

## Gotchas

- **T4 이전 silent failure**: `loadExisting()`의 `{ data }` destructure에서 `error`를 무시했다. `data`가 null이어도 `setResponses([])`로만 처리 — 초기 로드 실패 원인을 알 수 없었다. 수정 후: `fetchError`를 `error` state에 세팅.
- **CHANNEL_ERROR 재연결 미구현**: 현재 CHANNEL_ERROR 발생 시 `error` 상태 세팅만 하고, 자동 재구독 로직은 없다. 장기 연결이 필요한 강사 세션에서 연결 단절 시 수동 새로고침 필요.
- **`useRef` 클라이언트 필수**: `useState(createClient())`로 바꾸면 리렌더링마다 새 Supabase 클라이언트가 생성되어 채널이 중복 구독됨.
- **Realtime RLS**: `responses` 테이블에 RLS가 활성화되어 있으므로, Realtime 구독도 해당 사용자가 볼 수 있는 행만 수신. 타 수강생 응답은 자동 필터링.

## Changelog

- 2026-04-11 — T4: `loadExisting()` error 처리 추가, CHANNEL_ERROR/TIMED_OUT 핸들링, `error` 반환 필드 추가 (silent failure 교정)
- 초기 — `responses` Realtime INSERT 구독 + 중복 방지 기본 구조
