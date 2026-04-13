import { z } from "zod/v4";

export const QuestionTypeSchema = z.enum([
  "multiple_choice",
  "true_false",
  "code_output",
  "find_bug",
  "fill_blank",
  "short_answer",
]);

export const DifficultySchema = z.enum(["easy", "medium", "hard"]);

export const GeneratedQuizQuestionSchema = z.object({
  question_text: z.string().min(1),
  question_type: QuestionTypeSchema,
  code_snippet: z.string().nullable().optional(),
  code_language: z.string().nullable().optional(),
  options: z.array(z.string()).max(5),
  correct_answer: z.string().min(1),
  topic_tag: z.string().min(1),
  misconception_tags: z.array(z.string()).nullable().optional(),
  difficulty: DifficultySchema,
  explanation: z.string().min(1),
});

export const QuizGenerationResponseSchema = z.object({
  questions: z.array(GeneratedQuizQuestionSchema).min(1).max(5),
});

export type GeneratedQuizQuestion = z.infer<typeof GeneratedQuizQuestionSchema>;
export type QuizGenerationResponse = z.infer<typeof QuizGenerationResponseSchema>;
