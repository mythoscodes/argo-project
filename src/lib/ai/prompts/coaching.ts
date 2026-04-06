// KIT(코리아IT아카데미) 강사 코칭 프롬프트
// 수강생 대상: 성인 직업훈련생, 비전공자~경력자 편차 큼

interface CoachingPromptParams {
  topic: string;
  understandingScores: Record<string, number>;
  incorrectPatterns: Array<{ question: string; wrongAnswer: string; count: number }>;
  totalStudents: number;
}

export function buildCoachingSystemPrompt(): string {
  return `당신은 코리아IT아카데미(KIT) 강사를 보조하는 AI입니다.
수강생은 성인 직업훈련생으로 비전공자부터 경력자까지 다양합니다.
강사가 수업 중 즉시 활용할 수 있는 간결한 코칭을 JSON으로 응답하세요.
한국어로, 각 필드 200자 이내.`;
}

export function buildCoachingUserPrompt(params: CoachingPromptParams): string {
  const { topic, understandingScores, incorrectPatterns, totalStudents } =
    params;

  const scoresText = Object.entries(understandingScores)
    .map(([concept, score]) => `${concept}: ${score}%`)
    .join(", ");

  const topIncorrect = incorrectPatterns
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(
      (p) =>
        `- 문제: "${p.question}" / 오답: "${p.wrongAnswer}" (${p.count}명)`
    )
    .join("\n");

  const fewShotExample = getCoachingFewShotExample(topic);

  return `주제: ${topic}
수강생 수: ${totalStudents}명
개념별 이해도: ${scoresText}
주요 오답 패턴:
${topIncorrect || "- 없음"}

참고 예시:
${fewShotExample}

위 상황을 분석하여 강사 코칭을 JSON으로 생성하세요.
코칭 규칙:
1. insight: 핵심 인사이트 한 문장 (가장 시급한 문제)
2. weakConcept: 가장 취약한 개념명
3. misconceptionDetail: 수강생이 왜 오개념을 갖게 됐는지 구체적 설명
4. suggestionBeginner: 비전공자 대상 즉시 활용 가능한 교수법
5. suggestionAdvanced: 경력자 대상 심화 접근 방법
6. interviewTip: 실무/면접에서 이 개념이 어떻게 활용되는지 (선택)`;
}

function getCoachingFewShotExample(topic: string): string {
  const topicLower = topic.toLowerCase();

  if (topicLower.includes("spring") || topicLower.includes("di") || topicLower.includes("ioc")) {
    return JSON.stringify(
      {
        insight: "IoC 컨테이너의 역할을 이해하지 못해 DI 개념이 흔들리고 있습니다.",
        weakConcept: "의존성 주입(DI)",
        misconceptionDetail:
          "수강생들이 new 키워드로 직접 객체를 생성하는 방식에 익숙해 스프링이 대신 객체를 관리한다는 개념을 어색하게 느낍니다.",
        suggestionBeginner:
          "레스토랑 비유: '직접 재료 사러 가는 것(new)' vs '배달시키는 것(DI)'으로 설명 후 @Autowired 예제 실습",
        suggestionAdvanced:
          "순환 참조 문제와 @Lazy, 생성자 주입 vs 필드 주입 성능 차이를 코드로 비교 시연",
        interviewTip: "면접에서 'DI를 왜 쓰나요?'는 단골 질문 — 테스트 용이성과 결합도 감소를 꼭 언급하세요.",
      },
      null,
      2
    );
  }

  if (topicLower.includes("react") || topicLower.includes("hook") || topicLower.includes("state")) {
    return JSON.stringify(
      {
        insight: "useState의 비동기 업데이트 특성을 이해하지 못해 상태 관리 오류가 반복되고 있습니다.",
        weakConcept: "React 상태 업데이트 비동기성",
        misconceptionDetail:
          "setState 호출 직후 바로 state 값이 바뀐다고 생각해 업데이트 직후 state를 참조하는 코드를 작성합니다.",
        suggestionBeginner:
          "콘솔 출력 실험: setState 후 즉시 console.log vs useEffect로 확인하는 비교 실습으로 비동기 동작 체감",
        suggestionAdvanced:
          "함수형 업데이트 패턴(prev => prev + 1)과 useReducer로 복잡한 상태 관리 리팩터링 실습",
        interviewTip:
          "면접에서 'React 리렌더링 최적화' 질문 시 useMemo, useCallback과 연결해 답변하면 차별화됩니다.",
      },
      null,
      2
    );
  }

  if (topicLower.includes("python") || topicLower.includes("파이썬")) {
    return JSON.stringify(
      {
        insight: "리스트와 참조 개념 혼동으로 얕은 복사 관련 오답이 집중됩니다.",
        weakConcept: "Python 얕은 복사 vs 깊은 복사",
        misconceptionDetail:
          "b = a로 리스트를 복사하면 새 리스트가 만들어진다고 생각하지만 실제로는 같은 객체를 참조합니다.",
        suggestionBeginner:
          "id() 함수로 메모리 주소를 직접 출력해 비교 — '같은 집 주소를 가리키는 두 이름표' 비유 활용",
        suggestionAdvanced:
          "copy 모듈의 copy()와 deepcopy() 차이를 중첩 리스트로 실험, numpy array와의 동작 차이 비교",
        interviewTip:
          "데이터 엔지니어링 면접에서 판다스 DataFrame 복사 관련 질문으로 자주 등장합니다.",
      },
      null,
      2
    );
  }

  if (topicLower.includes("sql") || topicLower.includes("join") || topicLower.includes("데이터베이스")) {
    return JSON.stringify(
      {
        insight: "INNER JOIN과 LEFT JOIN 결과 차이를 체감하지 못해 데이터 누락 오류가 발생합니다.",
        weakConcept: "SQL JOIN 종류별 동작",
        misconceptionDetail:
          "NULL 값이 포함된 행이 INNER JOIN에서 제외되는 원리를 모르고, 항상 모든 행이 결과에 포함된다고 생각합니다.",
        suggestionBeginner:
          "학생-성적 테이블로 실습: 성적 없는 학생이 INNER JOIN에서 사라지는 것을 직접 확인",
        suggestionAdvanced:
          "실무 데이터 정합성 체크 패턴 — LEFT JOIN + IS NULL로 누락 데이터 검출하는 쿼리 작성",
        interviewTip:
          "SI 면접에서 'JOIN 종류 설명하세요'는 필수 — 각 JOIN의 NULL 처리 방식까지 말하면 합격점입니다.",
      },
      null,
      2
    );
  }

  if (topicLower.includes("보안") || topicLower.includes("security") || topicLower.includes("network") || topicLower.includes("네트워크")) {
    return JSON.stringify(
      {
        insight: "개념 암기에 그쳐 실제 공격/방어 흐름을 연결하지 못하고 있습니다.",
        weakConcept: "보안 취약점 실습 연계",
        misconceptionDetail:
          "XSS와 CSRF를 이론으로는 알지만 실제 HTTP 요청 흐름에서 어느 시점에 발생하는지 파악하지 못합니다.",
        suggestionBeginner:
          "OWASP Top 10 카드 게임 방식으로 공격명 → 예방책 매칭 — 암기 부담 없이 패턴으로 익히기",
        suggestionAdvanced:
          "Burp Suite로 실제 요청 캡처 후 파라미터 조작 실습 — 공격자 시점에서 방어 로직 설계",
        interviewTip:
          "보안 면접에서 'HTTPS만 쓰면 안전한가?'에 MITM, 인증서 피닝까지 답변하면 깊이를 보여줄 수 있습니다.",
      },
      null,
      2
    );
  }

  // 기본 few-shot
  return JSON.stringify(
    {
      insight: "핵심 개념의 동작 원리보다 암기에 집중해 응용 문제에서 오답률이 높습니다.",
      weakConcept: topic,
      misconceptionDetail:
        "수강생들이 개념의 표면적 정의만 알고 실제 동작 메커니즘을 이해하지 못해 변형 문제에서 혼란을 겪습니다.",
      suggestionBeginner:
        "코드 한 줄씩 실행하며 '지금 무슨 일이 일어나고 있나요?' 질문 — 원리를 스스로 발견하게 유도",
      suggestionAdvanced:
        "엣지 케이스와 실무 사용 맥락을 중심으로 심화 토론 — '현업에서는 이런 상황을 어떻게 처리하나요?' 방식",
      interviewTip:
        "이 개념은 면접에서 '원리를 설명하세요' 형태로 자주 출제됩니다. 동작 흐름을 단계별로 설명하는 연습을 권장합니다.",
    },
    null,
    2
  );
}
