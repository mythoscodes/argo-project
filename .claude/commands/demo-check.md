공모전 데모 시나리오를 순서대로 점검합니다.

데모 6단계를 하나씩 테스트합니다:

1. **세션 생성**: POST /api/sessions → 참여 코드 발급 확인
2. **AI 퀴즈 생성**: POST /api/ai/quiz → Python 반복문 주제로 5문항 생성, JSON 파싱 확인
3. **수강생 응답**: POST /api/responses → 5명 수강생 응답 시뮬레이션
4. **이해도 히트맵**: GET /api/sessions/[id] → 개념별 이해도 데이터 확인
5. **AI 코칭**: POST /api/ai/coaching → 코칭 제안 생성 확인 (3초 이내)
6. **수강생 리포트**: POST /api/ai/report → 리포트 생성 확인

각 단계별 성공/실패를 체크리스트로 출력합니다. 실패 시 원인 분석 + 수정 방안 제시.
