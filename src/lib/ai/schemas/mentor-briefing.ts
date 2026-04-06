import { z } from "zod/v4";

export const mentorBriefingResponseSchema = z.object({
  riskAssessment: z.string(), // 이탈 위험 종합 판단 1-2문장
  talkingPoints: z.array(z.string()).min(1).max(5), // 상담 대화 포인트
  weaknessAnalysis: z.string(), // 약점 분석 요약
  recommendedCourses: z.array(
    z.object({
      courseTitle: z.string(),
      reason: z.string(), // 추천 이유 (약점 토픽 매칭 근거)
    })
  ),
  consultationStrategy: z.string(), // 권장 상담 전략
  encouragementTip: z.string(), // 수강생 격려 방향 제안
});

export type MentorBriefingResponse = z.infer<
  typeof mentorBriefingResponseSchema
>;
