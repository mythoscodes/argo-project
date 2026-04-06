// KIT(코리아IT아카데미) 멘토 상담 브리핑 프롬프트
// 멘토(학습 상담사) 대상: 수강생 개별 상담 전 AI가 준비해주는 브리핑

interface MentorBriefingPromptParams {
  studentName: string;
  subject: string;
  recentAccuracyRates: number[]; // 최근 세션별 정답률 (최신순)
  weakTopics: string[];
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  riskSignals: string[]; // 발동된 신호 설명
  availableCourses: Array<{
    title: string;
    category: string;
    topics: string[];
    instructorName: string;
    schedule: string | null;
  }>;
}

export function buildMentorBriefingSystemPrompt(): string {
  return `당신은 코리아IT아카데미(KIT) 멘토(학습 상담사)를 위한 상담 브리핑을 작성하는 AI입니다.
멘토는 수강생을 개별 관리하며, 이탈 방지와 학습 동기 부여가 핵심 업무입니다.
브리핑 작성 원칙:
- 멘토가 상담에서 바로 활용할 수 있는 구체적 대화 포인트 제공
- 수강생의 약점은 비난이 아닌 성장 가능성으로 표현
- 내부 강의 추천 시 약점 토픽과의 매칭 근거를 명시
- 국비지원 교육 맥락 반영 (취업 목표, 수료율 중요성)
- 상담 전략은 멘토 경험치와 무관하게 즉시 활용 가능하도록 구체적으로
JSON 형식으로만 응답하세요.`;
}

export function buildMentorBriefingUserPrompt(
  params: MentorBriefingPromptParams
): string {
  const {
    studentName,
    subject,
    recentAccuracyRates,
    weakTopics,
    riskLevel,
    riskSignals,
    availableCourses,
  } = params;

  const accuracyTrend =
    recentAccuracyRates.length > 0
      ? recentAccuracyRates.map((rate, idx) => `세션${idx + 1}: ${rate}%`).join(", ")
      : "데이터 없음";

  const weakTopicsText =
    weakTopics.length > 0 ? weakTopics.join(", ") : "없음";

  const riskSignalsText =
    riskSignals.length > 0 ? riskSignals.join(" / ") : "없음";

  const coursesText =
    availableCourses.length > 0
      ? availableCourses
          .map(
            (course) =>
              `- ${course.title} (${course.category}, 토픽: ${course.topics.join("·")}, ${course.instructorName}${course.schedule ? `, ${course.schedule}` : ""})`
          )
          .join("\n")
      : "등록된 내부 강의 없음";

  return `수강생: ${studentName}
수강 과목: ${subject}
이탈 위험도: ${riskLevel}
위험 신호: ${riskSignalsText}
최근 정답률 추이(최신순): ${accuracyTrend}
취약 토픽: ${weakTopicsText}

학원 내부 강의 목록:
${coursesText}

위 데이터를 분석하여 멘토 상담 브리핑을 JSON으로 생성하세요.
브리핑 규칙:
1. riskAssessment: 이탈 위험 종합 판단 1-2문장 (구체적 근거 포함)
2. talkingPoints: 오늘 상담에서 꺼낼 대화 포인트 3가지 (질문 형태 권장)
3. weaknessAnalysis: 약점 분석 요약 (어떤 개념이 왜 약한지, 비전공자 눈높이)
4. recommendedCourses: 내부 강의 중 이 수강생에게 적합한 것 1-2개 (없으면 빈 배열)
5. consultationStrategy: 이 수강생에게 효과적인 상담 방향 1-2문장
6. encouragementTip: 멘토가 수강생에게 전할 격려 포인트 (이름 포함)`;
}
