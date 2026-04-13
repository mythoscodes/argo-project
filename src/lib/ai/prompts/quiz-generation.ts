// KIT(코리아IT아카데미) 과정 기반 퀴즈 생성 프롬프트
// 수강생 대상: 성인, 비전공자~경력자 편차, 국비지원 직업훈련

interface QuizPromptParams {
  subject: string;
  topic: string;
  count: number;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  existingQuestions?: string[];
}

export function buildQuizSystemPrompt(): string {
  return `당신은 코리아IT아카데미(KIT) 강사를 보조하는 퀴즈 생성 AI입니다.
수강생은 성인 직업훈련생으로 비전공자부터 경력자까지 다양합니다.
반드시 아래 JSON 형식으로만 응답하세요.

응답 형식:
{
  "questions": [
    {
      "question_text": "문제 텍스트",
      "question_type": "multiple_choice|true_false|code_output|find_bug|fill_blank|short_answer",
      "code_snippet": "코드 (없으면 null)",
      "code_language": "java|javascript|python|null",
      "options": ["선택지1", "선택지2", ...],
      "correct_answer": "정답 (options 중 하나)",
      "topic_tag": "세부 토픽",
      "misconception_tags": ["흔한오해1", "흔한오해2"],
      "difficulty": "easy|medium|hard",
      "explanation": "정답 해설 (2문장 이내)"
    }
  ]
}

규칙:
- question_type이 code_output/find_bug/fill_blank면 code_snippet 필수
- true_false는 options: ["True", "False"]
- fill_blank의 code_snippet에서 빈칸은 ___로 표시
- short_answer는 주관식: options는 빈 배열 [], correct_answer에 모범 답안 작성 (키워드 중심 2~3문장)
- 한국어로 출력`;
}

export function buildQuizUserPrompt(params: QuizPromptParams): string {
  const { subject, topic, count, difficulty, existingQuestions } = params;

  const easyCount = difficulty === "mixed" ? Math.max(1, Math.floor(count * 0.3)) : (difficulty === "easy" ? count : 0);
  const medCount = difficulty === "mixed" ? Math.max(1, Math.floor(count * 0.4)) : (difficulty === "medium" ? count : 0);
  const hardCount = difficulty === "mixed" ? Math.max(1, count - easyCount - medCount) : (difficulty === "hard" ? count : 0);
  const shortAnswerCount = Math.max(1, Math.floor(count * 0.25));

  const difficultyGuide =
    difficulty === "mixed"
      ? `easy ${easyCount}개 (기초 개념 확인), medium ${medCount}개 (응용/코드 분석), hard ${hardCount}개 (실무/심화 사고)`
      : `모두 ${difficulty}`;

  const fewShotExample = getFewShotExample(subject);

  const avoidSection =
    existingQuestions && existingQuestions.length > 0
      ? `\n이미 출제된 문제 (절대 중복 금지):\n${existingQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}\n`
      : "";

  return `과목: ${subject}
주제: ${topic}
문제 수: ${count}개
난이도: ${difficultyGuide}
${avoidSection}
다음과 같은 유형으로 코드 중심 문제를 포함하여 생성하세요:
- code_output: "이 코드의 실행 결과는?" (객관식)
- find_bug: "이 코드에서 버그를 찾아라" (객관식)
- fill_blank: "빈칸에 들어갈 코드는?" (객관식)
- multiple_choice: 개념 이해 객관식
- short_answer: 주관식 서술형 ("~을 설명하시오", "~의 차이점은?")

중요 규칙:
- ${count}개 중 ${shortAnswerCount}개는 short_answer(주관식 서술형)로 생성하세요.
- 주관식(short_answer)은 options를 빈 배열 []로, correct_answer에 모범답안(3문장 이내)을 작성하세요.
- 나머지는 객관식으로, 유형을 다양하게 섞으세요 (code_output, find_bug, fill_blank, multiple_choice).
- easy 문제는 개념 정의/용어 확인, medium은 코드 분석/응용, hard는 실무 트러블슈팅/설계 판단.
- 같은 토픽이라도 난이도별로 다른 관점에서 출제하세요.

참고 예시:
${fewShotExample}

위 형식과 동일한 JSON으로 ${count}개의 문제를 생성하세요.`;
}

function getFewShotExample(subject: string): string {
  const subjectLower = subject.toLowerCase();

  if (subjectLower.includes("spring") || subjectLower.includes("java")) {
    return JSON.stringify(
      {
        question_text: "다음 코드의 실행 결과는?",
        question_type: "code_output",
        code_snippet:
          'public class Main {\n    public static void main(String[] args) {\n        int[] arr = {1, 2, 3};\n        System.out.println(arr[3]);\n    }\n}',
        code_language: "java",
        options: [
          "0",
          "ArrayIndexOutOfBoundsException",
          "NullPointerException",
          "3",
        ],
        correct_answer: "ArrayIndexOutOfBoundsException",
        topic_tag: "배열 인덱스",
        misconception_tags: ["배열 길이와 인덱스 혼동", "0-based 인덱싱"],
        difficulty: "easy",
        explanation:
          "배열 길이가 3이므로 유효 인덱스는 0~2입니다. arr[3] 접근 시 ArrayIndexOutOfBoundsException이 발생합니다.",
      },
      null,
      2
    );
  }

  if (subjectLower.includes("react") || subjectLower.includes("javascript")) {
    return JSON.stringify(
      {
        question_text: "다음 React 코드에서 버그를 찾아라",
        question_type: "find_bug",
        code_snippet:
          "function Counter() {\n  const [count, setCount] = useState(0);\n  const increment = () => {\n    count = count + 1;\n  };\n  return <button onClick={increment}>{count}</button>;\n}",
        code_language: "javascript",
        options: [
          "useState import 누락",
          "count를 직접 변경 (setCount 미사용)",
          "화살표 함수 문법 오류",
          "return 문 오류",
        ],
        correct_answer: "count를 직접 변경 (setCount 미사용)",
        topic_tag: "React 상태 관리",
        misconception_tags: ["state 불변성", "직접 변수 할당으로 리렌더링 가능"],
        difficulty: "medium",
        explanation:
          "React state는 setCount()를 통해서만 업데이트해야 합니다. count = count + 1은 리렌더링을 발생시키지 않습니다.",
      },
      null,
      2
    );
  }

  if (subjectLower.includes("python")) {
    return JSON.stringify(
      {
        question_text: "빈칸에 들어갈 코드로 리스트의 중복을 제거하려면?",
        question_type: "fill_blank",
        code_snippet:
          "numbers = [1, 2, 2, 3, 3, 4]\nunique = ___(numbers)\nprint(list(unique))",
        code_language: "python",
        options: ["list", "set", "dict", "tuple"],
        correct_answer: "set",
        topic_tag: "Python 자료형",
        misconception_tags: ["list()로 중복 제거 가능", "set 순서 보장"],
        difficulty: "easy",
        explanation:
          "set()은 중복을 허용하지 않으므로 중복 제거에 사용됩니다. 단, 순서는 보장되지 않습니다.",
      },
      null,
      2
    );
  }

  if (subjectLower.includes("보안") || subjectLower.includes("security")) {
    return JSON.stringify(
      {
        question_text: "다음 코드는 SQL Injection에 취약한가?",
        question_type: "true_false",
        code_snippet:
          'String query = "SELECT * FROM users WHERE id = " + userId;\nStatement stmt = conn.createStatement();\nResultSet rs = stmt.executeQuery(query);',
        code_language: "java",
        options: ["True", "False"],
        correct_answer: "True",
        topic_tag: "SQL Injection",
        misconception_tags: ["타입이 숫자면 안전", "Statement 사용이 안전"],
        difficulty: "medium",
        explanation:
          "사용자 입력을 문자열로 직접 쿼리에 삽입하면 SQL Injection에 취약합니다. PreparedStatement로 파라미터 바인딩해야 합니다.",
      },
      null,
      2
    );
  }

  if (subjectLower.includes("네트워크") || subjectLower.includes("network")) {
    return JSON.stringify(
      {
        question_text: "TCP 3-way handshake의 순서로 올바른 것은?",
        question_type: "multiple_choice",
        code_snippet: null,
        code_language: null,
        options: [
          "SYN → SYN-ACK → ACK",
          "ACK → SYN → SYN-ACK",
          "SYN → ACK → SYN-ACK",
          "SYN-ACK → SYN → ACK",
        ],
        correct_answer: "SYN → SYN-ACK → ACK",
        topic_tag: "TCP 연결 수립",
        misconception_tags: ["ACK 먼저 전송", "2-way handshake 혼동"],
        difficulty: "easy",
        explanation:
          "클라이언트가 SYN을 보내면 서버가 SYN-ACK로 응답하고, 클라이언트가 최종 ACK를 보내 연결이 성립됩니다.",
      },
      null,
      2
    );
  }

  // 기본 few-shot (과목 미매칭)
  return JSON.stringify(
    {
      question_text: "다음 코드의 실행 결과는?",
      question_type: "code_output",
      code_snippet: 'console.log(typeof null);',
      code_language: "javascript",
      options: ["null", "undefined", "object", "string"],
      correct_answer: "object",
      topic_tag: "JavaScript 타입",
      misconception_tags: ["null은 null 타입", "typeof null이 null 반환"],
      difficulty: "medium",
      explanation:
        "JavaScript에서 typeof null은 역사적 버그로 인해 'object'를 반환합니다.",
    },
    null,
    2
  );
}
