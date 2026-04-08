"use client";

import type { Database } from "@/types/database";
import { cn } from "@/lib/utils";

type ResponseRow = Database["public"]["Tables"]["responses"]["Row"];
type QuizRow = Database["public"]["Tables"]["quizzes"]["Row"];

interface ParticipantInfo {
  id: string;
  display_name: string;
}

interface UnderstandingHeatmapProps {
  responses: ResponseRow[];
  quizzes: QuizRow[];
  participants: ParticipantInfo[];
}

export function UnderstandingHeatmap({ responses, quizzes, participants }: UnderstandingHeatmapProps) {
  if (quizzes.length === 0 || participants.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        퀴즈와 참여자가 있으면 히트맵이 표시됩니다
      </div>
    );
  }

  // Build topic list from quizzes
  const topics = [...new Set(quizzes.map((q) => q.topic_tag))];

  // Build response lookup: student -> quiz -> response
  const responseMap = new Map<string, Map<string, ResponseRow>>();
  for (const resp of responses) {
    if (!responseMap.has(resp.student_id)) {
      responseMap.set(resp.student_id, new Map());
    }
    responseMap.get(resp.student_id)!.set(resp.quiz_id, resp);
  }

  // Compute per-student per-topic accuracy
  function getTopicAccuracy(studentId: string, topic: string): number | null {
    const topicQuizzes = quizzes.filter((q) => q.topic_tag === topic);
    const studentResponses = responseMap.get(studentId);
    if (!studentResponses) return null;

    const relevantResponses = topicQuizzes
      .map((q) => studentResponses.get(q.id))
      .filter(Boolean);

    if (relevantResponses.length === 0) return null;
    const correct = relevantResponses.filter((r) => r!.is_correct).length;
    return Math.round((correct / relevantResponses.length) * 100);
  }

  function getCellColor(accuracy: number | null): string {
    if (accuracy === null) return "bg-muted text-muted-foreground";
    if (accuracy >= 80) return "bg-green-100 text-green-800 border-green-200";
    if (accuracy >= 60) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left p-1.5 font-medium text-muted-foreground sticky left-0 bg-card z-10">
              수강생
            </th>
            {topics.map((topic) => (
              <th key={topic} className="p-1.5 font-medium text-muted-foreground text-center min-w-[60px]">
                {topic}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {participants.map((participant) => (
            <tr key={participant.id}>
              <td className="p-1.5 font-medium truncate max-w-[100px] sticky left-0 bg-card z-10">
                {participant.display_name}
              </td>
              {topics.map((topic) => {
                const accuracy = getTopicAccuracy(participant.id, topic);
                return (
                  <td key={topic} className="p-1">
                    <div
                      className={cn(
                        "rounded-md p-1.5 text-center font-mono font-medium border",
                        getCellColor(accuracy)
                      )}
                    >
                      {accuracy !== null ? `${accuracy}%` : "-"}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
