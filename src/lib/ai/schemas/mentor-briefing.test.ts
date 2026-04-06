import { describe, it, expect } from "vitest";
import { mentorBriefingResponseSchema } from "./mentor-briefing";

describe("mentorBriefingResponseSchema", () => {
  const validBriefing = {
    riskAssessment:
      "김민준 수강생은 최근 3세션 연속 정답률 하락과 출석 불량으로 이탈 위험이 높습니다.",
    talkingPoints: [
      "최근 수업에서 어려웠던 부분이 있었나요?",
      "JPA 관련 실습에서 막히는 부분을 구체적으로 이야기해볼까요?",
      "학습 계획을 함께 조정해보는 건 어떨까요?",
    ],
    weaknessAnalysis:
      "JPA 영속성 컨텍스트와 연관관계 매핑에서 지속적으로 오답이 발생합니다.",
    recommendedCourses: [
      {
        courseTitle: "Spring Data JPA 심화",
        reason: "약점 토픽(JPA, N+1) 3개 중 2개를 커버하는 강의",
      },
    ],
    consultationStrategy:
      "비전공자 출신이므로 이론보다 실습 위주 접근을 권장합니다.",
    encouragementTip:
      "김민준님, 처음엔 어렵지만 꾸준히 참여하고 계셔서 충분히 성장 가능성이 있습니다.",
  };

  it("유효한 브리핑을 통과시킴", () => {
    const result = mentorBriefingResponseSchema.safeParse(validBriefing);
    expect(result.success).toBe(true);
  });

  it("riskAssessment가 빈 문자열이면 통과 (빈 값 허용)", () => {
    const result = mentorBriefingResponseSchema.safeParse({
      ...validBriefing,
      riskAssessment: "",
    });
    expect(result.success).toBe(true);
  });

  it("talkingPoints가 빈 배열이면 실패 (최소 1개)", () => {
    const result = mentorBriefingResponseSchema.safeParse({
      ...validBriefing,
      talkingPoints: [],
    });
    expect(result.success).toBe(false);
  });

  it("talkingPoints 6개 이상이면 실패 (최대 5개)", () => {
    const result = mentorBriefingResponseSchema.safeParse({
      ...validBriefing,
      talkingPoints: ["1", "2", "3", "4", "5", "6"],
    });
    expect(result.success).toBe(false);
  });

  it("recommendedCourses가 빈 배열이면 통과 (추천 없을 수 있음)", () => {
    const result = mentorBriefingResponseSchema.safeParse({
      ...validBriefing,
      recommendedCourses: [],
    });
    expect(result.success).toBe(true);
  });

  it("recommendedCourses에 reason 누락 시 실패", () => {
    const result = mentorBriefingResponseSchema.safeParse({
      ...validBriefing,
      recommendedCourses: [{ courseTitle: "Spring 심화" }],
    });
    expect(result.success).toBe(false);
  });

  it("필수 필드 누락 시 실패", () => {
    const { talkingPoints: _, ...missing } = validBriefing;
    const result = mentorBriefingResponseSchema.safeParse(missing);
    expect(result.success).toBe(false);
  });

  it("잘못된 타입 시 실패", () => {
    const result = mentorBriefingResponseSchema.safeParse({
      ...validBriefing,
      riskAssessment: 123,
    });
    expect(result.success).toBe(false);
  });
});
