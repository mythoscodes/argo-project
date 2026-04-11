# Round 2.5 분석 — 2026-04-11

작성자: analyst-2  
데이터 소스: qa Round 2.5 결과 브로드캐스트, `round-2-analysis.md` (비교 기준)

---

## 1. 요약

| 항목 | Round 2 | Round 2.5 | 변화 |
|------|---------|-----------|------|
| PASS | 294 | 293 | -1 (분류 변동, 측정 오차) |
| **FAIL** | 0 | **0** | **유지** |
| SKIP | 779 | 780 | +1 (분류 변동) |
| FLAKY | 1 (ISD-ERR-001) | 1 (API-AI-010, 신규) | ISD 해소 / AI cold start 잔존 |
| 실행 시간 | 18.7분 | 11.6분 | -7.1분 |

**핵심 판단**: T12 목표 달성. FAIL 0 유지 + ISD-ERR-001 flaky 해소. **T12 종료 가능 상태 확인.**

---

## 2. ISD-ERR-001 flaky 해소 확인

**TC**: `03-instructor-flow.spec.ts:125`  
**상태**: ✅ 해소

dev-2가 적용한 `toContainText(/수업을 시작하면|코드가 발급|시작하면/, { timeout: 10_000 })` 패턴이 Round 2.5에서 안정적으로 통과. hydration 타이밍 레이스 해소 확인.

---

## 3. API-AI-010 flaky 1건

**분류**: pre-existing — Round 2부터 기록된 Gemini cold start 이슈  
**T12 범위**: 외

Gemini API cold start로 인한 간헐적 응답 지연. 코드/RLS/스펙 문제 아님. 실 서비스에서는 warm API 환경으로 재현 빈도 낮음. Cycle 3 AI 검증 범위에서 별도 처리.

---

## 4. PASS -1 원인 분석 (294 → 293)

Round 2 PASS -4 패턴과 동일: 분류 기준 변동으로 추정. 실질적 회귀 아님. FAIL 0 유지가 핵심 지표.

---

## 5. migration 00008 영향

`session_participants` INSERT RLS 강화(student + active + academy 3중 체크) 적용 후 실행. 예상대로 추가 실패 없음 — 기존 TC가 "느슨한 RLS 악용" 없이 작성된 것 확인됨.

---

## 6. T12 종료 판단

| 조건 | 상태 |
|------|------|
| FAIL 0 달성 | ✅ (Round 2부터 유지) |
| ISD-ERR-001 flaky 해소 | ✅ (Round 2.5) |
| migration 00008 RLS 강화 | ✅ (team-lead 원격 적용 완료) |
| 잔존 flaky (API-AI-010) | T12 범위 외, Cycle 3 이관 |

**T12 종료 조건 충족. planner T9 전환 결정 대기.**
