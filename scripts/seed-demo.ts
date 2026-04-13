/**
 * Argos 공모전 데모 시드 데이터
 *
 * 실행: npx tsx scripts/seed-demo.ts
 *
 * 필수 환경변수 (.env.local에서 로드):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY
 *
 * 생성되는 테스트 계정 (비밀번호 모두 test1234):
 *   - owner@kit.ac.kr    (원장 — 박원장)
 *   - teacher@kit.ac.kr   (강사 — 김강사)
 *   - mentor@kit.ac.kr    (멘토 — 이멘토)
 *   - student1@kit.ac.kr  (수강생 — 김민준, 위험)
 *   - student2@kit.ac.kr  (수강생 — 이지수, 주의)
 *   - student3@kit.ac.kr  (수강생 — 박서연, 양호)
 *   - student4@kit.ac.kr  (수강생 — 최현우, 양호)
 *   - student5@kit.ac.kr  (수강생 — 정하은, 초급)
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("환경변수가 설정되지 않았습니다.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "test1234";

// ── 고정 UUID v4 (재실행 시 중복 방지) ──
const IDS = {
  academy: "a0000001-0000-4000-a000-000000000001",
  owner: "b0000001-0000-4000-a000-000000000001",
  teacher: "b0000002-0000-4000-a000-000000000002",
  mentor: "b0000003-0000-4000-a000-000000000003",
  student1: "c0000011-0000-4000-a000-000000000011",
  student2: "c0000012-0000-4000-a000-000000000012",
  student3: "c0000013-0000-4000-a000-000000000013",
  student4: "c0000014-0000-4000-a000-000000000014",
  student5: "c0000015-0000-4000-a000-000000000015",
  session1: "d0000001-0000-4000-a000-000000000001",
  session2: "d0000002-0000-4000-a000-000000000002",
  session3: "d0000003-0000-4000-a000-000000000003",
};

async function createUser(id: string, email: string, name: string) {
  // 기존 유저 삭제 시도
  await supabase.auth.admin.deleteUser(id).catch(() => {});

  const { data, error } = await supabase.auth.admin.createUser({
    id,
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: name },
  });
  if (error && !error.message.includes("already")) {
    console.error(`유저 생성 실패 (${email}):`, error.message);
  }
  return data?.user?.id ?? id;
}

async function main() {
  console.log("=== Argos 데모 시드 시작 ===\n");

  // ── 1. 학원 ──
  console.log("1. 학원 생성...");
  await supabase.from("academies").upsert({
    id: IDS.academy,
    name: "코리아IT아카데미 부산캠퍼스",
    branch_code: "KIT-BUSAN",
    plan: "premium",
    max_students: 100,
  });

  // ── 2. 유저 (Auth + Profiles) ──
  console.log("2. 테스트 계정 생성...");

  const users = [
    { id: IDS.owner, email: "owner@kit.ac.kr", name: "박원장", role: "owner", exp: null, interests: [] },
    { id: IDS.teacher, email: "teacher@kit.ac.kr", name: "김강사", role: "teacher", exp: null, interests: [] },
    { id: IDS.mentor, email: "mentor@kit.ac.kr", name: "이멘토", role: "teacher", exp: null, interests: [] },
    { id: IDS.student1, email: "student1@kit.ac.kr", name: "김민준", role: "student", exp: "junior", interests: ["Spring/Java", "데이터분석"] },
    { id: IDS.student2, email: "student2@kit.ac.kr", name: "이지수", role: "student", exp: "beginner", interests: ["React/JavaScript", "Python"] },
    { id: IDS.student3, email: "student3@kit.ac.kr", name: "박서연", role: "student", exp: "mid", interests: ["Spring/Java", "정보보안"] },
    { id: IDS.student4, email: "student4@kit.ac.kr", name: "최현우", role: "student", exp: "beginner", interests: ["Python", "AI/ML"] },
    { id: IDS.student5, email: "student5@kit.ac.kr", name: "정하은", role: "student", exp: "junior", interests: ["React/JavaScript", "클라우드"] },
  ];

  for (const u of users) {
    await createUser(u.id, u.email, u.name);
  }

  // Profiles (upsert)
  await supabase.from("profiles").upsert(
    users.map((u) => ({
      id: u.id,
      academy_id: IDS.academy,
      role: u.role,
      display_name: u.name,
      email: u.email,
      experience_level: u.exp,
      interests: u.interests,
    }))
  );
  console.log(`   ${users.length}명 생성 완료`);

  // ── 3. 강의 카탈로그 ──
  console.log("3. 강의 카탈로그...");
  await supabase.from("courses").upsert([
    { id: "f3000001-0000-4000-a000-000000000001", academy_id: IDS.academy, title: "Spring Boot 웹 개발 기초", category: "programming", topics: ["Spring MVC", "JPA", "REST API"], instructor_name: "김강사", schedule: "월/수 10:00~13:00", is_active: true },
    { id: "f3000001-0000-4000-a000-000000000002", academy_id: IDS.academy, title: "React 프론트엔드 실무", category: "programming", topics: ["React Hooks", "상태관리", "TypeScript"], instructor_name: "김강사", schedule: "화/목 14:00~17:00", is_active: true },
    { id: "f3000001-0000-4000-a000-000000000003", academy_id: IDS.academy, title: "Python 데이터 분석", category: "data_science", topics: ["Pandas", "NumPy", "시각화", "전처리"], instructor_name: "김강사", schedule: "금 10:00~17:00", is_active: true },
    { id: "f3000001-0000-4000-a000-000000000004", academy_id: IDS.academy, title: "정보보안 기사 실기 대비", category: "security", topics: ["네트워크 보안", "시스템 보안", "암호화"], instructor_name: "김강사", schedule: "토 09:00~13:00", is_active: true },
    { id: "f3000001-0000-4000-a000-000000000005", academy_id: IDS.academy, title: "AI/ML 입문 과정", category: "ai_development", topics: ["머신러닝", "딥러닝", "TensorFlow"], instructor_name: "김강사", schedule: "월/수 14:00~17:00", is_active: true },
  ]);

  // ── 4. 세션 ──
  console.log("4. 수업 세션 생성...");

  const now = new Date();
  const dayAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

  await supabase.from("sessions").upsert([
    {
      id: IDS.session1,
      teacher_id: IDS.teacher,
      academy_id: IDS.academy,
      title: "Spring Boot JPA 3주차 — 연관관계 매핑",
      subject: "웹 개발",
      course_category: "programming",
      topics: ["JPA", "N+1 문제", "영속성 컨텍스트", "연관관계"],
      status: "completed",
      join_code: "SPR3WK",
      anonymous_mode: false,
      created_at: dayAgo(7),
      started_at: dayAgo(7),
      ended_at: dayAgo(7),
    },
    {
      id: IDS.session2,
      teacher_id: IDS.teacher,
      academy_id: IDS.academy,
      title: "React Hooks 심화 — useEffect와 커스텀 훅",
      subject: "프론트엔드",
      course_category: "programming",
      topics: ["useEffect", "커스텀 훅", "의존성 배열", "클린업"],
      status: "completed",
      join_code: "RCT2HK",
      anonymous_mode: false,
      created_at: dayAgo(3),
      started_at: dayAgo(3),
      ended_at: dayAgo(3),
    },
    {
      id: IDS.session3,
      teacher_id: IDS.teacher,
      academy_id: IDS.academy,
      title: "Python 데이터 전처리 실습",
      subject: "데이터 분석",
      course_category: "data_science",
      topics: ["Pandas", "결측치 처리", "정규화", "인코딩"],
      status: "active",
      join_code: "PYD4TA",
      anonymous_mode: false,
      created_at: dayAgo(0),
      started_at: dayAgo(0),
    },
  ]);

  // ── 5. 세션 참여자 ──
  console.log("5. 세션 참여자...");
  const studentIds = [IDS.student1, IDS.student2, IDS.student3, IDS.student4, IDS.student5];
  const sessionIds = [IDS.session1, IDS.session2, IDS.session3];

  const participantRows = [];
  for (const sid of sessionIds) {
    const members = sid === IDS.session3
      ? [IDS.student1, IDS.student2, IDS.student4, IDS.student5] // session3: student3 미참여
      : studentIds;
    for (const uid of members) {
      participantRows.push({ session_id: sid, student_id: uid });
    }
  }
  await supabase.from("session_participants").upsert(participantRows, { onConflict: "session_id,student_id" });

  // ── 6. 퀴즈 ──
  console.log("6. 퀴즈 생성...");

  // Session 1 퀴즈 (JPA)
  const s1Quizzes = [
    { id: "e0000001-0001-4000-a000-000000000001", session_id: IDS.session1, question_text: "다음 코드에서 N+1 문제가 발생하는 이유는?", question_type: "code_output", code_snippet: "@Entity\npublic class Team {\n  @OneToMany(mappedBy=\"team\")\n  private List<Member> members;\n}\n\n// teamRepository.findAll() 호출 후 team.getMembers() 접근", code_language: "java", options: ["지연 로딩으로 추가 쿼리 발생", "즉시 로딩 설정 오류", "트랜잭션 범위 문제", "캐시 미스"], correct_answer: "지연 로딩으로 추가 쿼리 발생", topic_tag: "N+1 문제", misconception_tags: ["LAZY 로딩이 항상 좋다", "JOIN FETCH 불필요"], round_number: 1, order_index: 0, difficulty: "medium" },
    { id: "e0000001-0001-4000-a000-000000000002", session_id: IDS.session1, question_text: "JPA 영속성 컨텍스트의 1차 캐시가 동작하는 범위는?", question_type: "multiple_choice", code_snippet: null, code_language: null, options: ["애플리케이션 전체", "트랜잭션 단위", "세션 단위", "요청 단위"], correct_answer: "트랜잭션 단위", topic_tag: "영속성 컨텍스트", misconception_tags: ["1차 캐시는 전역적", "EntityManager는 싱글톤"], round_number: 1, order_index: 1, difficulty: "easy" },
    { id: "e0000001-0001-4000-a000-000000000003", session_id: IDS.session1, question_text: "@ManyToOne 연관관계에서 외래키(FK)는 어느 테이블에 위치하는가?", question_type: "multiple_choice", code_snippet: null, code_language: null, options: ["@ManyToOne이 선언된 엔티티의 테이블", "@OneToMany가 선언된 엔티티의 테이블", "별도의 조인 테이블", "양쪽 테이블 모두"], correct_answer: "@ManyToOne이 선언된 엔티티의 테이블", topic_tag: "연관관계", misconception_tags: ["조인 테이블 항상 필요"], round_number: 1, order_index: 2, difficulty: "medium" },
    { id: "e0000001-0001-4000-a000-000000000004", session_id: IDS.session1, question_text: "N+1 문제를 해결하기 위한 방법을 설명하시오.", question_type: "short_answer", code_snippet: null, code_language: null, options: [], correct_answer: "JOIN FETCH를 사용하여 연관 엔티티를 한 번의 쿼리로 함께 조회하거나, @EntityGraph를 사용하여 fetch 전략을 지정합니다.", topic_tag: "N+1 문제", misconception_tags: [], round_number: 1, order_index: 3, difficulty: "hard" },
    { id: "e0000001-0001-4000-a000-000000000005", session_id: IDS.session1, question_text: "영속성 컨텍스트의 변경 감지(Dirty Checking)란 무엇인지 설명하시오.", question_type: "short_answer", code_snippet: null, code_language: null, options: [], correct_answer: "영속 상태의 엔티티 필드를 변경하면, 트랜잭션 커밋 시점에 JPA가 자동으로 변경을 감지하여 UPDATE 쿼리를 실행하는 기능입니다.", topic_tag: "영속성 컨텍스트", misconception_tags: [], round_number: 1, order_index: 4, difficulty: "medium" },
  ];

  // Session 2 퀴즈 (React Hooks)
  const s2Quizzes = [
    { id: "e0000002-0002-4000-a000-000000000001", session_id: IDS.session2, question_text: "useEffect의 클린업 함수는 언제 호출되는가?", question_type: "multiple_choice", code_snippet: null, code_language: null, options: ["컴포넌트 마운트 시", "컴포넌트 언마운트 시 또는 의존성 변경 전", "매 렌더링마다", "상태 변경 시"], correct_answer: "컴포넌트 언마운트 시 또는 의존성 변경 전", topic_tag: "useEffect", misconception_tags: ["클린업은 언마운트만"], round_number: 1, order_index: 0, difficulty: "medium" },
    { id: "e0000002-0002-4000-a000-000000000002", session_id: IDS.session2, question_text: "다음 코드에서 버그를 찾아라", question_type: "find_bug", code_snippet: "function Timer() {\n  const [count, setCount] = useState(0);\n  \n  useEffect(() => {\n    setInterval(() => {\n      setCount(count + 1);\n    }, 1000);\n  }, []);\n  \n  return <div>{count}</div>;\n}", code_language: "javascript", options: ["useState 초기값 오류", "클로저로 인한 stale state (count가 항상 0)", "setInterval 대신 setTimeout 사용해야 함", "useEffect 의존성 배열에 count 누락만 하면 됨"], correct_answer: "클로저로 인한 stale state (count가 항상 0)", topic_tag: "useEffect", misconception_tags: ["의존성 배열에 count 추가하면 해결"], round_number: 1, order_index: 1, difficulty: "hard" },
    { id: "e0000002-0002-4000-a000-000000000003", session_id: IDS.session2, question_text: "커스텀 훅의 이름 규칙으로 올바른 것은?", question_type: "multiple_choice", code_snippet: null, code_language: null, options: ["반드시 use로 시작", "반드시 Hook으로 끝남", "대문자로 시작", "규칙 없음"], correct_answer: "반드시 use로 시작", topic_tag: "커스텀 훅", misconception_tags: [], round_number: 1, order_index: 2, difficulty: "easy" },
    { id: "e0000002-0002-4000-a000-000000000004", session_id: IDS.session2, question_text: "useEffect의 의존성 배열(dependency array)의 역할을 설명하시오.", question_type: "short_answer", code_snippet: null, code_language: null, options: [], correct_answer: "의존성 배열에 지정된 값이 변경될 때만 effect가 재실행됩니다. 빈 배열이면 마운트 시 1회만, 생략하면 매 렌더링마다 실행됩니다.", topic_tag: "useEffect", misconception_tags: [], round_number: 1, order_index: 3, difficulty: "medium" },
    { id: "e0000002-0002-4000-a000-000000000005", session_id: IDS.session2, question_text: "커스텀 훅을 사용하는 장점을 2가지 이상 서술하시오.", question_type: "short_answer", code_snippet: null, code_language: null, options: [], correct_answer: "1) 상태 로직의 재사용이 가능합니다. 2) 컴포넌트의 코드가 간결해지고 관심사가 분리됩니다. 3) 테스트가 용이해집니다.", topic_tag: "커스텀 훅", misconception_tags: [], round_number: 1, order_index: 4, difficulty: "medium" },
  ];

  // Session 3 퀴즈 (Python)
  const s3Quizzes = [
    { id: "e0000003-0003-4000-a000-000000000001", session_id: IDS.session3, question_text: "Pandas에서 결측치(NaN)를 확인하는 메서드는?", question_type: "multiple_choice", code_snippet: null, code_language: null, options: ["df.isnull()", "df.isnan()", "df.missing()", "df.empty()"], correct_answer: "df.isnull()", topic_tag: "Pandas", misconception_tags: [], round_number: 1, order_index: 0, difficulty: "easy" },
    { id: "e0000003-0003-4000-a000-000000000002", session_id: IDS.session3, question_text: "다음 코드의 출력 결과는?", question_type: "code_output", code_snippet: "import pandas as pd\ndf = pd.DataFrame({'A': [1, None, 3], 'B': [4, 5, None]})\nprint(df.dropna().shape)", code_language: "python", options: ["(3, 2)", "(2, 2)", "(1, 2)", "(0, 2)"], correct_answer: "(1, 2)", topic_tag: "결측치 처리", misconception_tags: ["dropna는 행 단위가 아닌 열 단위"], round_number: 1, order_index: 1, difficulty: "medium" },
    { id: "e0000003-0003-4000-a000-000000000003", session_id: IDS.session3, question_text: "Min-Max 정규화 공식으로 올바른 것은?", question_type: "multiple_choice", code_snippet: null, code_language: null, options: ["(x - mean) / std", "(x - min) / (max - min)", "x / max", "(x - median) / IQR"], correct_answer: "(x - min) / (max - min)", topic_tag: "정규화", misconception_tags: ["표준화와 정규화 혼동"], round_number: 1, order_index: 2, difficulty: "medium" },
    { id: "e0000003-0003-4000-a000-000000000004", session_id: IDS.session3, question_text: "결측치 처리 방법 3가지를 설명하시오.", question_type: "short_answer", code_snippet: null, code_language: null, options: [], correct_answer: "1) 삭제: dropna()로 결측치가 있는 행/열 제거. 2) 대체: fillna()로 평균, 중앙값, 최빈값 등으로 대체. 3) 보간: interpolate()로 전후 값 기반 보간.", topic_tag: "결측치 처리", misconception_tags: [], round_number: 1, order_index: 3, difficulty: "medium" },
    { id: "e0000003-0003-4000-a000-000000000005", session_id: IDS.session3, question_text: "원-핫 인코딩(One-Hot Encoding)의 개념과 사용 시 주의점을 설명하시오.", question_type: "short_answer", code_snippet: null, code_language: null, options: [], correct_answer: "범주형 변수를 0과 1로 이루어진 이진 벡터로 변환하는 방법입니다. 카테고리가 많으면 차원이 급증(차원의 저주)하므로 주의해야 합니다.", topic_tag: "인코딩", misconception_tags: [], round_number: 1, order_index: 4, difficulty: "hard" },
  ];

  const allQuizzes = [...s1Quizzes, ...s2Quizzes, ...s3Quizzes];
  await supabase.from("quizzes").upsert(allQuizzes as never[]);
  console.log(`   ${allQuizzes.length}개 퀴즈 생성`);

  // ── 7. 응답 ──
  console.log("7. 수강생 응답 데이터...");

  // 학생별 성적 패턴: 김민준(급락), 이지수(정체), 박서연(향상), 최현우(보통), 정하은(보통)
  type ResponseSeed = {
    quiz_id: string; session_id: string; student_id: string;
    selected_answer: string; is_correct: boolean; response_time_ms: number;
    round_number: number;
  };
  const responses: ResponseSeed[] = [];

  function addResponse(quizId: string, sessionId: string, studentId: string, correct: boolean, timeMs: number) {
    const quiz = allQuizzes.find((q) => q.id === quizId)!;
    responses.push({
      quiz_id: quizId,
      session_id: sessionId,
      student_id: studentId,
      selected_answer: correct ? quiz.correct_answer : (quiz.options[0] !== quiz.correct_answer ? quiz.options[0] : quiz.options[1] ?? "오답"),
      is_correct: correct,
      response_time_ms: timeMs,
      round_number: quiz.round_number,
    });
  }

  // Session 1 (JPA) — 5명 모두 참여
  //                              민준(급락)  지수(정체)  서연(향상)  현우(보통)  하은(보통)
  const s1Pattern: boolean[][] = [
    /* Q1 N+1       */ [false,     true,      true,      true,      false   ],
    /* Q2 영속성    */ [true,      true,      true,      false,     true    ],
    /* Q3 연관관계  */ [false,     false,     true,      true,      true    ],
    /* Q4 주관N+1   */ [false,     false,     true,      false,     false   ],
    /* Q5 주관영속  */ [false,     true,      true,      true,      false   ],
  ];
  s1Quizzes.forEach((q, qi) => {
    studentIds.forEach((sid, si) => {
      addResponse(q.id, IDS.session1, sid, s1Pattern[qi][si], 8000 + Math.random() * 20000);
    });
  });

  // Session 2 (React) — 5명 모두 참여
  const s2Pattern: boolean[][] = [
    /* Q1 useEffect */ [false,     true,      true,      false,     true    ],
    /* Q2 버그찾기  */ [false,     false,     true,      false,     false   ],
    /* Q3 커스텀훅  */ [true,      true,      true,      true,      true    ],
    /* Q4 주관Effect*/ [false,     true,      true,      false,     true    ],
    /* Q5 주관훅장점*/ [false,     false,     true,      true,      false   ],
  ];
  s2Quizzes.forEach((q, qi) => {
    studentIds.forEach((sid, si) => {
      addResponse(q.id, IDS.session2, sid, s2Pattern[qi][si], 6000 + Math.random() * 25000);
    });
  });

  // Session 3 (Python) — student3(박서연) 미참여
  const s3Students = [IDS.student1, IDS.student2, IDS.student4, IDS.student5];
  const s3Pattern: boolean[][] = [
    /* Q1 Pandas    */ [false,     true,      true,      true     ],
    /* Q2 결측치    */ [false,     false,     false,     true     ],
    /* Q3 정규화    */ [true,      true,      true,      false    ],
    /* Q4 주관결측  */ [false,     false,     false,     false    ],
    /* Q5 주관인코딩*/ [false,     false,     false,     false    ],
  ];
  s3Quizzes.forEach((q, qi) => {
    s3Students.forEach((sid, si) => {
      addResponse(q.id, IDS.session3, sid, s3Pattern[qi][si], 10000 + Math.random() * 30000);
    });
  });

  await supabase.from("responses").upsert(responses as never[]);
  console.log(`   ${responses.length}개 응답 생성`);

  // ── 8. 분석 결과 ──
  console.log("8. 분석 결과...");
  await supabase.from("analysis_results").upsert([
    {
      id: "f0000001-0000-4000-a000-000000000001",
      session_id: IDS.session1,
      analysis_type: "realtime",
      understanding_scores: { "N+1 문제": 60, "영속성 컨텍스트": 80, "연관관계": 60 },
      weak_topics: ["N+1 문제", "연관관계"],
      coaching_suggestion: "N+1 문제에서 60%의 수강생이 어려움을 겪고 있습니다. JOIN FETCH 개념을 다시 설명하고, 실습으로 쿼리 차이를 직접 확인시켜 주세요.",
    },
    {
      id: "f0000001-0000-4000-a000-000000000002",
      session_id: IDS.session2,
      analysis_type: "realtime",
      understanding_scores: { "useEffect": 50, "커스텀 훅": 80 },
      weak_topics: ["useEffect"],
      coaching_suggestion: "useEffect의 클로저와 의존성 배열 개념이 취약합니다. 실제 버그 사례를 보여주며 stale state 문제를 체감시켜 주세요.",
    },
  ] as never[]);

  // ── 9. 역량 진단 결과 ──
  console.log("9. 역량 진단 결과...");
  await supabase.from("skill_assessments" as never).upsert([
    {
      id: "f1000001-0000-4000-a000-000000000001",
      student_id: IDS.student1,
      academy_id: IDS.academy,
      subject: "Spring/Java",
      assessment_type: "periodic",
      assessment_trigger: "periodic",
      skill_scores: [
        { topic: "JPA", score: 35, level: "beginner", feedback: "기본 CRUD는 가능하나 연관관계 매핑에 어려움" },
        { topic: "Spring MVC", score: 55, level: "elementary", feedback: "컨트롤러 작성은 가능, 예외처리 미흡" },
        { topic: "REST API", score: 40, level: "beginner", feedback: "GET/POST 구분은 가능, RESTful 설계 원칙 미숙" },
      ],
      overall_level: "beginner",
    },
    {
      id: "f1000001-0000-4000-a000-000000000002",
      student_id: IDS.student2,
      academy_id: IDS.academy,
      subject: "React/JavaScript",
      assessment_type: "periodic",
      assessment_trigger: "periodic",
      skill_scores: [
        { topic: "React Hooks", score: 60, level: "intermediate", feedback: "useState은 능숙, useEffect 의존성 이해 부족" },
        { topic: "상태관리", score: 50, level: "elementary", feedback: "props drilling은 이해, Context API 미경험" },
        { topic: "TypeScript", score: 30, level: "beginner", feedback: "타입 기본 개념만 이해" },
      ],
      overall_level: "elementary",
    },
    {
      id: "f1000001-0000-4000-a000-000000000003",
      student_id: IDS.student3,
      academy_id: IDS.academy,
      subject: "Spring/Java",
      assessment_type: "periodic",
      assessment_trigger: "periodic",
      skill_scores: [
        { topic: "JPA", score: 85, level: "advanced", feedback: "연관관계 매핑, Fetch 전략 능숙" },
        { topic: "Spring MVC", score: 90, level: "advanced", feedback: "예외처리, 인터셉터, AOP 활용 가능" },
        { topic: "REST API", score: 80, level: "advanced", feedback: "RESTful 설계, HATEOAS 개념 이해" },
      ],
      overall_level: "advanced",
    },
    {
      id: "f1000001-0000-4000-a000-000000000004",
      student_id: IDS.student4,
      academy_id: IDS.academy,
      subject: "Python",
      assessment_type: "periodic",
      assessment_trigger: "periodic",
      skill_scores: [
        { topic: "기본 문법", score: 70, level: "intermediate", feedback: "변수, 함수, 클래스 기본 활용 가능" },
        { topic: "Pandas", score: 45, level: "elementary", feedback: "DataFrame 생성은 가능, 고급 조작 미숙" },
        { topic: "시각화", score: 35, level: "beginner", feedback: "Matplotlib 기초만 경험" },
      ],
      overall_level: "elementary",
    },
    {
      id: "f1000001-0000-4000-a000-000000000005",
      student_id: IDS.student5,
      academy_id: IDS.academy,
      subject: "React/JavaScript",
      assessment_type: "periodic",
      assessment_trigger: "periodic",
      skill_scores: [
        { topic: "React Hooks", score: 65, level: "intermediate", feedback: "기본 훅 사용 능숙, 최적화 훅 미경험" },
        { topic: "상태관리", score: 55, level: "elementary", feedback: "Redux 기본 개념 이해, 실습 부족" },
        { topic: "TypeScript", score: 60, level: "intermediate", feedback: "인터페이스, 제네릭 기본 이해" },
      ],
      overall_level: "intermediate",
    },
  ] as never[]);

  // ── 10. 상담 기록 ──
  console.log("10. 상담 기록...");
  await supabase.from("consultation_notes").upsert([
    {
      id: "f2000001-0000-4000-a000-000000000001",
      instructor_id: IDS.teacher,
      student_id: IDS.student1,
      academy_id: IDS.academy,
      type: "학습부진",
      content: "JPA 수업에서 지속적으로 낮은 정답률을 보이고 있음. 비전공 출신으로 객체지향 개념 자체가 부족한 상태. Java 기초 복습 후 JPA 재학습 권장. 별도 보충 시간 배정 논의.",
      next_consultation_date: dayAgo(-7), // 7일 후
    },
    {
      id: "f2000001-0000-4000-a000-000000000002",
      instructor_id: IDS.teacher,
      student_id: IDS.student2,
      academy_id: IDS.academy,
      type: "진로",
      content: "프론트엔드 개발자 취업 희망. React는 중급 수준이나 TypeScript에 대한 두려움이 있음. TypeScript 기초 특강 수강 권유. 포트폴리오 프로젝트로 React + TS 조합 추천.",
      next_consultation_date: dayAgo(-14),
    },
    {
      id: "f2000001-0000-4000-a000-000000000003",
      instructor_id: IDS.teacher,
      student_id: IDS.student1,
      academy_id: IDS.academy,
      type: "출결",
      content: "최근 2회 연속 Python 수업 지각. 야근으로 인한 체력 저하 호소. 야간반 전환 또는 온라인 보강 방안 논의.",
    },
  ] as never[]);

  // ── 완료 ──
  console.log("\n=== 시드 완료 ===\n");
  console.log("테스트 계정 (비밀번호: test1234):");
  console.log("─────────────────────────────────");
  console.log("  원장:    owner@kit.ac.kr");
  console.log("  강사:    teacher@kit.ac.kr");
  console.log("  멘토:    mentor@kit.ac.kr");
  console.log("  수강생1: student1@kit.ac.kr (김민준, 위험)");
  console.log("  수강생2: student2@kit.ac.kr (이지수, 주의)");
  console.log("  수강생3: student3@kit.ac.kr (박서연, 양호)");
  console.log("  수강생4: student4@kit.ac.kr (최현우, 초급)");
  console.log("  수강생5: student5@kit.ac.kr (정하은, 중급)");
  console.log("─────────────────────────────────\n");
}

main().catch((err) => {
  console.error("시드 실패:", err);
  process.exit(1);
});
