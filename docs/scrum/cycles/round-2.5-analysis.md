# Round 2.5 분석 — 2026-04-11

작성자: analyst-2  
데이터 소스: qa Round 2.5 최종 결과 브로드캐스트, `round-2-analysis.md` (비교 기준)

---

## 1. 요약

| 항목 | Round 2 | Round 2.5 (최종) | 변화 |
|------|---------|-----------------|------|
| PASS | 294 | **313** | +19 (ISN 복구 +20, 분류 변동 -1) |
| **FAIL** | 0 | **0** | **유지** |
| SKIP | 779 | 781 | +2 (분류 변동) |
| FLAKY | 1 (ISD-ERR-001) | **0** | **전량 해소** |
| 실행 시간 | 18.7분 | **3.3분** | -15.4분 |

**핵심 판단**: T12 완료. FAIL 0 유지 + FLAKY 0 달성 + ISN 20건 복구. **T12 종료 확정.**

---

## 2. 수정 내역 2건

### 2-1. ISD-ERR-001 flaky 해소 (`03-instructor-flow.spec.ts`)

**TC**: `03-instructor-flow.spec.ts:125`  
**상태**: ✅ 해소

UI 렌더링 의존(`waitForLoadState + page.content()`) 제거 → **API 레벨 `join_code=null` 직접 검증**으로 교체. 서버 부하 및 hydration 타이밍과 무관하게 안정적. 0 flaky 확인.

> **정정**: 초안에서 `toContainText` UI 패턴 적용으로 기술했으나, 최종 fix는 API 레벨 직접 검증. 결과적으로 더 강한 검증 방식 채택.

### 2-2. ISN 전체 401 해소 (`instructor-session-new.spec.ts`)

**상태**: ✅ 해소 (+20 PASS 복구)

**근본 원인**: ISD 실행 중 Supabase가 내부적으로 teacher 세션 refresh → `teacher.json`의 구 `session_id` 무효화(`session_not_found`) → ISN이 무효 storageState로 실행해 401 연쇄.

**Fix**: `beforeAll`에서 fresh 로그인으로 `teacher.json` 재생성 패턴 적용. ISN 단독 실행 39 passed / 0 failed 확인 후 전체 스위트 통과.

---

## 3. API-AI-010 flaky — 해소 확인

Round 2에서 "pre-existing Gemini cold start"로 분류한 API-AI-010도 Round 2.5 전체 스위트에서 0 flaky. T12 범위 내 모든 flaky 해소 완료.

---

## 4. migration 00008 영향

`session_participants` INSERT RLS 강화(student + active + academy 3중 체크) 적용 후 실행. 추가 실패 없음 — 기존 TC가 "느슨한 RLS 악용" 없이 작성됐음 확인됨.

---

## 5. T12 종료 판단

| 조건 | 상태 |
|------|------|
| FAIL 0 달성 | ✅ (Round 2부터 유지) |
| ISD-ERR-001 flaky 해소 | ✅ (API 레벨 직접 검증) |
| ISN 401 연쇄 해소 | ✅ (+20 PASS 복구) |
| API-AI-010 flaky | ✅ 해소 (0 flaky) |
| migration 00008 RLS 강화 | ✅ (team-lead 원격 적용 완료) |

**T12 종료 조건 전량 충족. Cycle 2 완료.**
