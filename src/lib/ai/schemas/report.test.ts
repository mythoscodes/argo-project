import { describe, it, expect } from "vitest";
import { reportResponseSchema } from "./report";

const validReport = {
  overallScore: 75,
  summary: "전반적으로 핵심 개념을 잘 이해하고 있습니다. 약점 토픽을 보완하면 더욱 완성도가 높아질 거예요.",
  topicResults: [
    { topic: "Spring Bean", score: 85, feedback: "Bean 생명주기를 잘 이해하고 있습니다." },
    { topic: "DI", score: 55, feedback: "생성자 주입 패턴을 연습해보세요." },
  ],
  weakTopics: ["DI"],
  recommendations: [
    "생성자 주입 예제를 직접 작성해보기",
    "Spring Boot 튜토리얼 따라하기",
    "면접 질문 답변 연습하기",
  ],
  encouragement: "꾸준히 노력하는 모습이 훌륭합니다. 조금만 더 하면 목표를 이룰 수 있어요!",
};

describe("reportResponseSchema", () => {
  describe("유효한 데이터", () => {
    it("완전한 유효 데이터를 통과한다", () => {
      const result = reportResponseSchema.safeParse(validReport);
      expect(result.success).toBe(true);
    });

    it("overallScore 0 경계값을 통과한다", () => {
      const result = reportResponseSchema.safeParse({ ...validReport, overallScore: 0 });
      expect(result.success).toBe(true);
    });

    it("overallScore 100 경계값을 통과한다", () => {
      const result = reportResponseSchema.safeParse({ ...validReport, overallScore: 100 });
      expect(result.success).toBe(true);
    });

    it("topicResults 빈 배열을 통과한다", () => {
      const result = reportResponseSchema.safeParse({ ...validReport, topicResults: [] });
      expect(result.success).toBe(true);
    });

    it("weakTopics 빈 배열을 통과한다", () => {
      const result = reportResponseSchema.safeParse({ ...validReport, weakTopics: [] });
      expect(result.success).toBe(true);
    });

    it("recommendations 단일 항목을 통과한다", () => {
      const result = reportResponseSchema.safeParse({
        ...validReport,
        recommendations: ["학습 추천 한 개"],
      });
      expect(result.success).toBe(true);
    });

    it("topicResults score 0-100 경계값을 통과한다", () => {
      const result = reportResponseSchema.safeParse({
        ...validReport,
        topicResults: [
          { topic: "토픽A", score: 0, feedback: "피드백" },
          { topic: "토픽B", score: 100, feedback: "피드백" },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("유효하지 않은 데이터", () => {
    it("overallScore가 0 미만이면 실패한다", () => {
      const result = reportResponseSchema.safeParse({ ...validReport, overallScore: -1 });
      expect(result.success).toBe(false);
    });

    it("overallScore가 100 초과면 실패한다", () => {
      const result = reportResponseSchema.safeParse({ ...validReport, overallScore: 101 });
      expect(result.success).toBe(false);
    });

    it("overallScore가 문자열이면 실패한다", () => {
      const result = reportResponseSchema.safeParse({ ...validReport, overallScore: "75" });
      expect(result.success).toBe(false);
    });

    it("summary가 없으면 실패한다", () => {
      const { summary: _, ...rest } = validReport;
      const result = reportResponseSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("topicResults의 score가 100 초과면 실패한다", () => {
      const result = reportResponseSchema.safeParse({
        ...validReport,
        topicResults: [{ topic: "토픽", score: 150, feedback: "피드백" }],
      });
      expect(result.success).toBe(false);
    });

    it("topicResults 항목에 feedback이 없으면 실패한다", () => {
      const result = reportResponseSchema.safeParse({
        ...validReport,
        topicResults: [{ topic: "토픽", score: 80 }],
      });
      expect(result.success).toBe(false);
    });

    it("recommendations가 배열이 아니면 실패한다", () => {
      const result = reportResponseSchema.safeParse({
        ...validReport,
        recommendations: "추천 문자열",
      });
      expect(result.success).toBe(false);
    });

    it("encouragement가 없으면 실패한다", () => {
      const { encouragement: _, ...rest } = validReport;
      const result = reportResponseSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("필수 필드가 모두 없으면 실패한다", () => {
      const result = reportResponseSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("타입 추론", () => {
    it("parse 결과가 올바른 타입을 반환한다", () => {
      const result = reportResponseSchema.parse(validReport);
      expect(typeof result.overallScore).toBe("number");
      expect(typeof result.summary).toBe("string");
      expect(Array.isArray(result.topicResults)).toBe(true);
      expect(Array.isArray(result.weakTopics)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(typeof result.encouragement).toBe("string");
    });
  });
});
