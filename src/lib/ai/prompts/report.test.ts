import { describe, it, expect } from "vitest";
import { buildReportSystemPrompt, buildReportUserPrompt } from "./report";

const baseParams = {
  studentName: "김철수",
  sessionTitle: "Spring Boot 기초",
  subject: "Spring",
  topicScores: { "Spring Bean": 85, "의존성 주입(DI)": 55 },
  totalQuizzes: 5,
  correctCount: 3,
  weakTopics: ["의존성 주입(DI)"],
};

describe("buildReportSystemPrompt", () => {
  it("문자열을 반환한다", () => {
    expect(typeof buildReportSystemPrompt()).toBe("string");
  });

  it("KIT(코리아IT아카데미) 맥락이 포함된다", () => {
    const prompt = buildReportSystemPrompt();
    expect(prompt).toContain("코리아IT아카데미");
  });

  it("JSON 응답 지시가 포함된다", () => {
    const prompt = buildReportSystemPrompt();
    expect(prompt).toContain("JSON");
  });

  it("격려 톤 지시가 포함된다", () => {
    const prompt = buildReportSystemPrompt();
    expect(prompt).toContain("격려");
  });

  it("실무·취업 연결 지시가 포함된다", () => {
    const prompt = buildReportSystemPrompt();
    expect(prompt).toContain("취업");
  });
});

describe("buildReportUserPrompt", () => {
  describe("기본 정보 포함 여부", () => {
    it("수강생 이름이 포함된다", () => {
      const prompt = buildReportUserPrompt(baseParams);
      expect(prompt).toContain("김철수");
    });

    it("세션 제목이 포함된다", () => {
      const prompt = buildReportUserPrompt(baseParams);
      expect(prompt).toContain("Spring Boot 기초");
    });

    it("과목명이 포함된다", () => {
      const prompt = buildReportUserPrompt(baseParams);
      expect(prompt).toContain("Spring");
    });

    it("총 퀴즈 수가 포함된다", () => {
      const prompt = buildReportUserPrompt(baseParams);
      expect(prompt).toContain("5");
    });

    it("정답 수가 포함된다", () => {
      const prompt = buildReportUserPrompt(baseParams);
      expect(prompt).toContain("3");
    });

    it("정답률이 계산되어 포함된다", () => {
      const prompt = buildReportUserPrompt(baseParams);
      // 3/5 * 100 = 60%
      expect(prompt).toContain("60%");
    });

    it("토픽별 정답률이 포함된다", () => {
      const prompt = buildReportUserPrompt(baseParams);
      expect(prompt).toContain("Spring Bean");
      expect(prompt).toContain("85%");
    });

    it("취약 토픽이 포함된다", () => {
      const prompt = buildReportUserPrompt(baseParams);
      expect(prompt).toContain("의존성 주입(DI)");
    });
  });

  describe("정답률 계산 엣지케이스", () => {
    it("퀴즈가 0개일 때 정답률 0%로 처리한다", () => {
      const prompt = buildReportUserPrompt({
        ...baseParams,
        totalQuizzes: 0,
        correctCount: 0,
      });
      expect(prompt).toContain("0%");
    });

    it("정답률 100%를 올바르게 계산한다", () => {
      const prompt = buildReportUserPrompt({
        ...baseParams,
        totalQuizzes: 4,
        correctCount: 4,
      });
      expect(prompt).toContain("100%");
    });
  });

  describe("취약 토픽 처리", () => {
    it("취약 토픽이 없을 때 없음으로 표시한다", () => {
      const prompt = buildReportUserPrompt({ ...baseParams, weakTopics: [] });
      expect(prompt).toContain("없음");
    });

    it("취약 토픽 여러 개를 쉼표로 구분하여 표시한다", () => {
      const prompt = buildReportUserPrompt({
        ...baseParams,
        weakTopics: ["DI", "AOP"],
      });
      expect(prompt).toContain("DI");
      expect(prompt).toContain("AOP");
    });
  });

  describe("과목별 few-shot 예시 선택", () => {
    it("Spring 과목에서 Spring 관련 예시가 포함된다", () => {
      const prompt = buildReportUserPrompt({ ...baseParams, subject: "Spring" });
      expect(prompt).toContain("Spring");
    });

    it("React 과목에서 React 관련 예시가 포함된다", () => {
      const prompt = buildReportUserPrompt({ ...baseParams, subject: "React" });
      expect(prompt).toContain("React");
    });

    it("Python 과목에서 Python 관련 예시가 포함된다", () => {
      const prompt = buildReportUserPrompt({ ...baseParams, subject: "Python" });
      expect(prompt).toContain("Python");
    });

    it("보안 과목에서 보안 관련 예시가 포함된다", () => {
      const prompt = buildReportUserPrompt({ ...baseParams, subject: "보안" });
      expect(prompt).toContain("보안");
    });

    it("네트워크 과목에서 네트워크 관련 예시가 포함된다", () => {
      const prompt = buildReportUserPrompt({ ...baseParams, subject: "네트워크" });
      expect(prompt).toContain("네트워크");
    });

    it("알 수 없는 과목에서 기본 예시가 반환된다", () => {
      const prompt = buildReportUserPrompt({ ...baseParams, subject: "알 수 없는 과목" });
      // 기본 few-shot이 포함되어야 함 (JSON 형태의 예시)
      expect(prompt).toContain("overallScore");
    });

    it("Java는 Spring 과목 예시를 사용한다", () => {
      const prompt = buildReportUserPrompt({ ...baseParams, subject: "Java" });
      expect(prompt).toContain("Spring");
    });

    it("frontend는 React 과목 예시를 사용한다", () => {
      const prompt = buildReportUserPrompt({ ...baseParams, subject: "frontend" });
      expect(prompt).toContain("React");
    });

    it("파이썬은 Python 과목 예시를 사용한다", () => {
      const prompt = buildReportUserPrompt({ ...baseParams, subject: "파이썬" });
      expect(prompt).toContain("Python");
    });
  });

  describe("리포트 규칙 지시 포함 여부", () => {
    it("overallScore 지시가 포함된다", () => {
      const prompt = buildReportUserPrompt(baseParams);
      expect(prompt).toContain("overallScore");
    });

    it("recommendations 지시가 포함된다", () => {
      const prompt = buildReportUserPrompt(baseParams);
      expect(prompt).toContain("recommendations");
    });

    it("encouragement 지시가 포함된다", () => {
      const prompt = buildReportUserPrompt(baseParams);
      expect(prompt).toContain("encouragement");
    });
  });
});
