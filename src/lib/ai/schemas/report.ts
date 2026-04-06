import { z } from "zod/v4";

export const reportResponseSchema = z.object({
  overallScore: z.number().min(0).max(100),
  summary: z.string(),                    // 전체 요약 2-3문장
  topicResults: z.array(z.object({
    topic: z.string(),
    score: z.number().min(0).max(100),
    feedback: z.string(),                 // 토픽별 피드백
  })),
  weakTopics: z.array(z.string()),
  recommendations: z.array(z.string()),   // 학습 추천 3-5개
  encouragement: z.string(),              // 격려 메시지
});

export type ReportResponse = z.infer<typeof reportResponseSchema>;
