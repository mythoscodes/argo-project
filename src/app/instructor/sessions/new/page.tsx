"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const COURSE_CATEGORIES = [
  { value: "programming", label: "프로그래밍 (Spring/React/Python)" },
  { value: "security", label: "정보보안" },
  { value: "network", label: "네트워크" },
  { value: "data_science", label: "데이터사이언스" },
  { value: "ai_development", label: "AI 개발" },
  { value: "ai_software", label: "AI 소프트웨어" },
];

export default function NewSessionPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [courseCategory, setCourseCategory] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleAddTopic(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const tag = topicInput.trim().replace(",", "");
      if (tag && !topics.includes(tag)) {
        setTopics([...topics, tag]);
      }
      setTopicInput("");
    }
  }

  function handleRemoveTopic(topic: string) {
    setTopics(topics.filter((t) => t !== topic));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title || !subject) {
      setError("수업 제목과 과목을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subject,
          courseCategory: courseCategory || undefined,
          topics,
          anonymousMode,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        setError(result.error ?? "세션 생성에 실패했습니다.");
        return;
      }

      const result = await response.json();
      router.push(`/instructor/sessions/${result.data.id}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/instructor"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        세션 목록으로
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>새 수업 세션 만들기</CardTitle>
          <CardDescription>
            수업 정보를 입력하면 참여 코드가 자동 발급됩니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">수업 제목 *</Label>
              <Input
                id="title"
                placeholder="예: Spring Boot JPA 3주차"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">과목 *</Label>
              <Input
                id="subject"
                placeholder="예: 웹 개발, 데이터 분석"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            {/* Course Category */}
            <div className="space-y-2">
              <Label>과정 카테고리</Label>
              <Select value={courseCategory} onValueChange={setCourseCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  {COURSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Topics */}
            <div className="space-y-2">
              <Label htmlFor="topics">수업 주제 태그</Label>
              <Input
                id="topics"
                placeholder="주제를 입력하고 Enter (예: JPA, N+1, 영속성)"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={handleAddTopic}
              />
              {topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {topics.map((topic) => (
                    <Badge
                      key={topic}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                      onClick={() => handleRemoveTopic(topic)}
                    >
                      {topic} &times;
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                AI 퀴즈 생성 시 이 주제들이 활용됩니다
              </p>
            </div>

            {/* Anonymous Mode */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={anonymousMode}
                onClick={() => setAnonymousMode(!anonymousMode)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  anonymousMode ? "bg-primary" : "bg-input"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
                    anonymousMode ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <div>
                <Label>익명 모드</Label>
                <p className="text-xs text-muted-foreground">
                  수강생 이름을 숨기고 익명으로 응답을 수집합니다
                </p>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" size="lg" disabled={isLoading} className="flex-1">
                {isLoading ? "생성 중..." : "세션 생성"}
              </Button>
              <Button type="button" variant="outline" size="lg" asChild>
                <Link href="/instructor">취소</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
