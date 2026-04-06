import { describe, it, expect } from "vitest";
import {
  buildMentorBriefingSystemPrompt,
  buildMentorBriefingUserPrompt,
} from "./mentor-briefing";

describe("buildMentorBriefingSystemPrompt", () => {
  it("KIT 멘토 맥락이 포함됨", () => {
    const prompt = buildMentorBriefingSystemPrompt();
    expect(prompt).toContain("코리아IT아카데미");
    expect(prompt).toContain("멘토");
    expect(prompt).toContain("이탈 방지");
  });

  it("JSON 응답 지시가 포함됨", () => {
    const prompt = buildMentorBriefingSystemPrompt();
    expect(prompt).toContain("JSON");
  });

  it("국비지원 교육 맥락이 포함됨", () => {
    const prompt = buildMentorBriefingSystemPrompt();
    expect(prompt).toContain("국비지원");
  });
});

describe("buildMentorBriefingUserPrompt", () => {
  const baseParams = {
    studentName: "김민준",
    subject: "Spring",
    recentAccuracyRates: [80, 60, 35],
    weakTopics: ["JPA", "N+1"],
    riskLevel: "HIGH" as const,
    riskSignals: ["평균 정답률 58%로 기준 미달", "1회 연속 미참여"],
    availableCourses: [
      {
        title: "Spring Data JPA 심화",
        category: "programming",
        topics: ["JPA", "N+1", "영속성 컨텍스트"],
        instructorName: "박강사",
        schedule: "매주 화/목 14:00",
      },
    ],
  };

  it("수강생 이름이 포함됨", () => {
    const prompt = buildMentorBriefingUserPrompt(baseParams);
    expect(prompt).toContain("김민준");
  });

  it("이탈 위험도가 포함됨", () => {
    const prompt = buildMentorBriefingUserPrompt(baseParams);
    expect(prompt).toContain("HIGH");
  });

  it("최근 정답률이 포함됨", () => {
    const prompt = buildMentorBriefingUserPrompt(baseParams);
    expect(prompt).toContain("80%");
    expect(prompt).toContain("60%");
    expect(prompt).toContain("35%");
  });

  it("약점 토픽이 포함됨", () => {
    const prompt = buildMentorBriefingUserPrompt(baseParams);
    expect(prompt).toContain("JPA");
    expect(prompt).toContain("N+1");
  });

  it("내부 강의 목록이 포함됨", () => {
    const prompt = buildMentorBriefingUserPrompt(baseParams);
    expect(prompt).toContain("Spring Data JPA 심화");
    expect(prompt).toContain("박강사");
    expect(prompt).toContain("매주 화/목 14:00");
  });

  it("위험 신호 설명이 포함됨", () => {
    const prompt = buildMentorBriefingUserPrompt(baseParams);
    expect(prompt).toContain("평균 정답률 58%로 기준 미달");
  });

  it("브리핑 규칙이 포함됨 (6개 필드)", () => {
    const prompt = buildMentorBriefingUserPrompt(baseParams);
    expect(prompt).toContain("riskAssessment");
    expect(prompt).toContain("talkingPoints");
    expect(prompt).toContain("weaknessAnalysis");
    expect(prompt).toContain("recommendedCourses");
    expect(prompt).toContain("consultationStrategy");
    expect(prompt).toContain("encouragementTip");
  });

  it("약점 토픽 없을 때 '없음' 표시", () => {
    const prompt = buildMentorBriefingUserPrompt({
      ...baseParams,
      weakTopics: [],
    });
    expect(prompt).toContain("취약 토픽: 없음");
  });

  it("내부 강의 없을 때 안내 메시지 표시", () => {
    const prompt = buildMentorBriefingUserPrompt({
      ...baseParams,
      availableCourses: [],
    });
    expect(prompt).toContain("등록된 내부 강의 없음");
  });

  it("정답률 데이터 없을 때 '데이터 없음' 표시", () => {
    const prompt = buildMentorBriefingUserPrompt({
      ...baseParams,
      recentAccuracyRates: [],
    });
    expect(prompt).toContain("데이터 없음");
  });

  it("강의 schedule이 null이면 생략", () => {
    const prompt = buildMentorBriefingUserPrompt({
      ...baseParams,
      availableCourses: [
        {
          title: "Python 기초",
          category: "programming",
          topics: ["변수", "함수"],
          instructorName: "이강사",
          schedule: null,
        },
      ],
    });
    expect(prompt).toContain("Python 기초");
    expect(prompt).toContain("이강사");
    expect(prompt).not.toContain("null");
  });
});
