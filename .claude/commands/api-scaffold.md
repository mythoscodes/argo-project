지정된 기능의 API Route를 스캐폴딩합니다.

rules/development.md의 API Route 패턴을 따라:
1. `src/app/api/{경로}/route.ts` 파일 생성
2. Zod 입력 검증 스키마 포함
3. Supabase 서버 클라이언트 사용
4. 인증 확인 로직 포함 (보호된 엔드포인트)
5. 에러 핸들링 패턴 적용
6. 타입 안전한 응답 구조

AI 관련 API Route의 경우:
7. `src/lib/ai/prompts/{기능}.ts` 프롬프트 파일 생성
8. `src/lib/ai/schemas/{기능}.ts` Zod 스키마 생성
9. `getModel()` 사용하여 모델 선택
10. JSON 파싱 재시도 로직 포함

인자로 기능명을 받습니다. 예: `/api-scaffold ai/quiz` 또는 `/api-scaffold sessions`
