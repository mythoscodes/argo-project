// KIT(코리아IT아카데미) 수강생 학습 리포트 프롬프트
// 수강생 대상: 성인 직업훈련생, 비전공자~경력자 편차 큼

interface ReportPromptParams {
  studentName: string;
  sessionTitle: string;
  subject: string;
  topicScores: Record<string, number>;
  totalQuizzes: number;
  correctCount: number;
  weakTopics: string[];
}

export function buildReportSystemPrompt(): string {
  return `당신은 코리아IT아카데미(KIT) 수강생의 학습 리포트를 작성하는 AI입니다.
수강생은 성인 직업훈련생으로 비전공자부터 경력자까지 다양합니다.
리포트 작성 원칙:
- 격려하는 톤으로, 비전공자도 이해할 수 있는 쉬운 언어 사용
- 약점은 지적이 아닌 성장 기회로 표현
- 학습 추천은 구체적 방향 제시 (무료 자료 링크 대신 학습 방법 위주)
- 실무·취업 연결 포인트 반드시 포함
JSON 형식으로만 응답하세요.`;
}

export function buildReportUserPrompt(params: ReportPromptParams): string {
  const {
    studentName,
    sessionTitle,
    subject,
    topicScores,
    totalQuizzes,
    correctCount,
    weakTopics,
  } = params;

  const accuracyRate =
    totalQuizzes > 0 ? Math.round((correctCount / totalQuizzes) * 100) : 0;

  const topicScoresText = Object.entries(topicScores)
    .map(([topic, score]) => `${topic}: ${score}%`)
    .join(", ");

  const weakTopicsText =
    weakTopics.length > 0 ? weakTopics.join(", ") : "없음";

  const fewShotExample = getReportFewShotExample(subject);

  return `수강생: ${studentName}
수업: ${sessionTitle} (${subject})
총 퀴즈: ${totalQuizzes}문제 / 정답: ${correctCount}문제 (정답률 ${accuracyRate}%)
토픽별 정답률: ${topicScoresText}
취약 토픽: ${weakTopicsText}

참고 예시:
${fewShotExample}

위 학습 데이터를 분석하여 수강생 맞춤 리포트를 JSON으로 생성하세요.
리포트 규칙:
1. overallScore: 0-100 종합 점수 (정답률 기반, 토픽 난이도 가중 반영)
2. summary: 전체 학습 현황 요약 2-3문장 (강점 먼저, 약점은 성장 기회로)
3. topicResults: 각 토픽별 점수와 맞춤 피드백 (비전공자 눈높이, 1-2문장)
4. weakTopics: 60% 미만 취약 토픽 목록
5. recommendations: 학습 추천 3-5개 (구체적 방법, 실무 연결)
6. encouragement: 수강생 이름을 포함한 진심 어린 격려 메시지 (1-2문장)`;
}

function getReportFewShotExample(subject: string): string {
  const subjectLower = subject.toLowerCase();

  if (
    subjectLower.includes("spring") ||
    subjectLower.includes("java") ||
    subjectLower.includes("백엔드")
  ) {
    return JSON.stringify(
      {
        overallScore: 72,
        summary:
          "Spring의 핵심 개념인 Bean 생명주기와 트랜잭션 관리를 잘 이해하고 있습니다. DI(의존성 주입)와 AOP 개념은 조금 더 연습하면 실무에서 자신 있게 활용할 수 있을 거예요.",
        topicResults: [
          {
            topic: "Spring Bean",
            score: 85,
            feedback:
              "Bean 생명주기 이해도가 높습니다. @Scope 어노테이션 활용 연습으로 완성도를 높여보세요.",
          },
          {
            topic: "의존성 주입(DI)",
            score: 55,
            feedback:
              "생성자 주입과 필드 주입의 차이를 간단한 예제로 직접 작성해보면 빠르게 익힐 수 있습니다.",
          },
        ],
        weakTopics: ["의존성 주입(DI)", "AOP"],
        recommendations: [
          "DI의 세 가지 방식(생성자/세터/필드 주입)을 각각 코드로 작성하고 차이점을 메모해두기",
          "간단한 To-Do API를 Spring Boot로 직접 구현하며 전체 흐름 체험",
          "면접을 위해 '@Autowired와 생성자 주입의 차이'를 말로 설명하는 연습",
        ],
        encouragement:
          "처음 접하는 프레임워크임에도 72점이라는 훌륭한 결과를 냈습니다. 이 속도라면 취업 준비도 충분히 가능해요!",
      },
      null,
      2
    );
  }

  if (
    subjectLower.includes("react") ||
    subjectLower.includes("프론트엔드") ||
    subjectLower.includes("frontend")
  ) {
    return JSON.stringify(
      {
        overallScore: 68,
        summary:
          "JSX 문법과 컴포넌트 구조를 탄탄하게 이해하고 있습니다. useState와 useEffect의 동작 방식을 좀 더 깊이 이해하면 실제 프로젝트에서 훨씬 수월하게 작업할 수 있을 거예요.",
        topicResults: [
          {
            topic: "컴포넌트",
            score: 80,
            feedback:
              "컴포넌트 분리와 Props 전달을 잘 이해하고 있습니다. 재사용 가능한 컴포넌트 설계 연습으로 실력을 올려보세요.",
          },
          {
            topic: "Hooks",
            score: 52,
            feedback:
              "useState 비동기 특성이 헷갈릴 수 있어요. 콘솔 출력으로 상태 변화를 직접 확인하는 실습이 큰 도움이 됩니다.",
          },
        ],
        weakTopics: ["Hooks", "상태 관리"],
        recommendations: [
          "counter 앱을 만들며 useState의 비동기 특성을 콘솔로 직접 확인해보기",
          "간단한 쇼핑 카트를 구현하며 상태 끌어올리기(State Lifting) 연습",
          "취업 포트폴리오로 날씨 앱 또는 Todo 앱 완성해두기",
        ],
        encouragement:
          "React는 처음에는 낯설지만 반복할수록 빠르게 늘어나는 기술입니다. 지금 페이스를 유지하면 충분히 취업 준비가 됩니다!",
      },
      null,
      2
    );
  }

  if (subjectLower.includes("python") || subjectLower.includes("파이썬")) {
    return JSON.stringify(
      {
        overallScore: 75,
        summary:
          "Python 기본 문법과 자료구조를 탄탄하게 익혔습니다. 함수와 클래스 개념을 실무 예제와 연결하는 연습을 더 하면 데이터 분석이나 자동화 업무에 바로 적용할 수 있어요.",
        topicResults: [
          {
            topic: "자료구조",
            score: 82,
            feedback:
              "리스트와 딕셔너리 활용을 잘 이해하고 있습니다. 집합(set)과 튜플도 언제 쓰는지 정리해두면 코딩 테스트에 도움이 돼요.",
          },
          {
            topic: "함수",
            score: 63,
            feedback:
              "기본 함수 작성은 잘 하고 있어요. 람다 함수와 map/filter를 활용하면 코드가 훨씬 간결해집니다.",
          },
        ],
        weakTopics: ["클래스", "예외 처리"],
        recommendations: [
          "클래스로 간단한 은행 계좌 시스템 만들어보기 (상속 개념 포함)",
          "try-except를 활용한 파일 읽기/쓰기 예제 연습",
          "실무에서 많이 쓰는 pandas 기초 문법 미리 맛보기",
        ],
        encouragement:
          "비전공자임에도 75점이라는 훌륭한 결과입니다. Python은 취업 시장에서 매우 강력한 무기가 될 거예요, 자신감을 가지세요!",
      },
      null,
      2
    );
  }

  if (
    subjectLower.includes("보안") ||
    subjectLower.includes("security") ||
    subjectLower.includes("network") ||
    subjectLower.includes("네트워크")
  ) {
    return JSON.stringify(
      {
        overallScore: 70,
        summary:
          "네트워크 기본 개념과 보안 원칙을 잘 이해하고 있습니다. 실습 중심의 학습을 더하면 현업에서 바로 통하는 실력이 됩니다.",
        topicResults: [
          {
            topic: "TCP/IP",
            score: 78,
            feedback:
              "3-way handshake를 잘 이해하고 있습니다. 패킷 분석 도구(Wireshark)로 실제 트래픽을 확인해보면 더 와닿을 거예요.",
          },
          {
            topic: "웹 보안",
            score: 58,
            feedback:
              "XSS와 SQL Injection 개념은 이해하고 있어요. OWASP Top 10을 실습 예제로 하나씩 확인해보는 것을 추천합니다.",
          },
        ],
        weakTopics: ["웹 보안", "암호화"],
        recommendations: [
          "OWASP WebGoat 같은 실습 환경에서 취약점 직접 탐색해보기",
          "공개 CTF 문제 풀이로 실전 감각 익히기",
          "보안 자격증(정보보안기사 또는 CEH) 준비 방향 검토",
        ],
        encouragement:
          "보안 분야는 꾸준히 공부할수록 차별화되는 분야입니다. 지금처럼 기초를 단단히 다지면 분명 좋은 결과가 있을 거예요!",
      },
      null,
      2
    );
  }

  // 기본 few-shot
  return JSON.stringify(
    {
      overallScore: 70,
      summary:
        "이번 수업에서 핵심 개념을 성실하게 학습했습니다. 조금 더 연습이 필요한 부분이 있지만, 현재 성장 속도라면 충분히 극복할 수 있습니다.",
      topicResults: [
        {
          topic: "주요 개념",
          score: 70,
          feedback:
            "기초 이해도는 갖추고 있습니다. 실제 예제로 반복 연습하면 더욱 탄탄해질 거예요.",
        },
      ],
      weakTopics: [],
      recommendations: [
        "수업 내용을 직접 코드나 메모로 정리하며 복습하기",
        "모르는 개념은 작은 예제를 만들어 직접 실험해보기",
        "취업 연관성을 생각하며 실무 적용 사례 찾아보기",
      ],
      encouragement:
        "꾸준히 노력하는 모습이 보입니다. 작은 성취를 쌓아가다 보면 반드시 목표를 이룰 수 있습니다!",
    },
    null,
    2
  );
}
