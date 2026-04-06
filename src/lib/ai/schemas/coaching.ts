import { z } from "zod/v4";

export const coachingResponseSchema = z.object({
  insight: z.string().max(100),           // 핵심 인사이트
  weakConcept: z.string(),                // 취약 개념
  misconceptionDetail: z.string(),         // 오개념 상세
  suggestionBeginner: z.string(),          // 비전공자 제안
  suggestionAdvanced: z.string(),          // 경력자 제안
  interviewTip: z.string().optional(),     // 면접 팁
});

export type CoachingResponse = z.infer<typeof coachingResponseSchema>;
