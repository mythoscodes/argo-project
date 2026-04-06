import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";

type ModelPurpose = "quiz" | "coaching" | "analysis" | "report" | "mentor-briefing";

const ENV_KEY_MAP: Record<ModelPurpose, string> = {
  quiz: "AI_MODEL_QUIZ",
  coaching: "AI_MODEL_COACHING",
  analysis: "AI_MODEL_ANALYSIS",
  report: "AI_MODEL_REPORT",
  "mentor-briefing": "AI_MODEL_MENTOR_BRIEFING",
};

const MODEL_ID_MAP = {
  "gemini-3-flash": "gemini-3.0-flash",
  "claude-sonnet": "claude-sonnet-4-6",
} as const;

type ModelKey = keyof typeof MODEL_ID_MAP;

function resolveModelKey(purpose?: ModelPurpose): ModelKey {
  if (purpose) {
    const envKey = ENV_KEY_MAP[purpose];
    const purposeModel = process.env[envKey] as ModelKey | undefined;
    if (purposeModel && purposeModel in MODEL_ID_MAP) {
      return purposeModel;
    }
  }

  const defaultModel = (process.env.AI_MODEL ?? "gemini-3-flash") as ModelKey;
  return defaultModel;
}

export function getModel(purpose?: ModelPurpose) {
  const modelKey = resolveModelKey(purpose);

  if (modelKey === "claude-sonnet") {
    const anthropic = createAnthropic();
    return anthropic(MODEL_ID_MAP["claude-sonnet"]);
  }

  const google = createGoogleGenerativeAI();
  return google(MODEL_ID_MAP["gemini-3-flash"]);
}
