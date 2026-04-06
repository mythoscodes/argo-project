// AI 관련 공통 타입 정의

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
}

export interface QuizGenerationRequest {
  sessionId: string;
  subject: string;
  topic: string;
  count: number;
  difficulty?: "easy" | "medium" | "hard" | "mixed";
}

export interface CoachingInsight {
  summary: string;
  weakTopics: string[];
  recommendations: string[];
  encouragement: string;
}

export interface UnderstandingLevel {
  topic: string;
  level: number; // 0-100
  responseCount: number;
}
