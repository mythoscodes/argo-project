배포 전 최종 점검을 실행합니다.

## 빌드 검사
1. `pnpm build` 성공 여부
2. TypeScript 에러 0개 확인 (`pnpm tsc --noEmit`)
3. 미사용 import 검사

## 환경변수 검사
4. `.env.example`의 모든 키가 Vercel 환경변수에 설정되어 있는지 확인
5. `.env.local`이 git에 포함되지 않는지 확인

## 보안 검사
6. `/security-audit` 자동 실행

## 기능 검사
7. `/demo-check` 자동 실행

## 배포
8. 모든 검사 통과 시 `vercel --prod` 배포 안내 (자동 실행은 하지 않음)

배포 URL과 함께 최종 결과를 리포트합니다.
