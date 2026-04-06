Supabase DB 마이그레이션을 생성하고 적용합니다.

1. `supabase/migrations/` 디렉토리의 기존 마이그레이션 확인
2. 다음 순번으로 새 마이그레이션 SQL 파일 생성
3. 테이블 생성 시 반드시 RLS 활성화 + 정책 포함 (rules/database.md 참조)
4. 인덱스 포함 (FK 컬럼)
5. `supabase db push`로 적용
6. `supabase gen types typescript --local > src/types/database.ts`로 타입 재생성

인자로 마이그레이션 설명을 받습니다. 예: `/db-migrate 세션 참여자 테이블 추가`
