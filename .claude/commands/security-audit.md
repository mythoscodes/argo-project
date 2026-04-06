프로젝트 보안 감사를 실행합니다.

다음 항목을 자동으로 점검합니다:

1. **API Key 노출 검사**
   - `src/` 내 코드에서 API 키 하드코딩 여부 (grep으로 패턴 검색)
   - `NEXT_PUBLIC_GOOGLE`, `NEXT_PUBLIC_ANTHROPIC`, `NEXT_PUBLIC_SUPABASE_SERVICE` 패턴 검색
   - `.env.local`이 `.gitignore`에 포함되어 있는지

2. **RLS 활성화 검사**
   - `supabase/migrations/` 내 모든 CREATE TABLE에 대응하는 ENABLE ROW LEVEL SECURITY가 있는지

3. **입력 검증 검사**
   - `src/app/api/` 내 모든 POST/PATCH 핸들러에서 Zod 검증을 사용하는지

4. **인증 검사**
   - 보호된 API Route에서 `supabase.auth.getUser()` 호출이 있는지

5. **의존성 취약점**
   - `pnpm audit` 실행 (가능한 경우)

결과를 PASS/WARN/FAIL로 리포트합니다.
