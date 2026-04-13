"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lightbulb, Zap, BarChart3, Brain, Users, EyeOff, HelpCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const COURSE_CATEGORIES = [
  { value: "programming", label: "프로그래밍 (Spring/React/Python)" },
  { value: "security", label: "정보보안" },
  { value: "network", label: "네트워크" },
  { value: "data_science", label: "데이터사이언스" },
  { value: "ai_development", label: "AI 개발" },
  { value: "ai_software", label: "AI 소프트웨어" },
];

const TOPIC_EXAMPLES: Record<string, string[]> = {
  programming: ["JPA", "N+1 문제", "REST API", "React Hooks", "예외처리", "상속"],
  security: ["SQL Injection", "XSS", "CSRF", "암호화", "인증/인가"],
  network: ["TCP/IP", "HTTP", "DNS", "서브넷팅", "라우팅"],
  data_science: ["Pandas", "정규화", "회귀분석", "시각화", "전처리"],
  ai_development: ["CNN", "RNN", "Transfer Learning", "Loss Function"],
  ai_software: ["프롬프트 엔지니어링", "RAG", "Fine-tuning", "벡터DB"],
};

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

  function handleAddSuggestedTopic(topic: string) {
    if (!topics.includes(topic)) {
      setTopics([...topics, topic]);
    }
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

  const suggestedTopics = TOPIC_EXAMPLES[courseCategory] ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/instructor"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        세션 목록으로
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 좌측: 메인 폼 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>새 수업 세션 만들기</CardTitle>
              <CardDescription>
                수업 정보를 입력하면 참여 코드가 자동 발급됩니다. 세션 생성 후 &ldquo;수업 시작&rdquo; 버튼을 누르면 수강생이 참여할 수 있습니다.
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
                  <p className="text-xs text-muted-foreground">
                    수강생에게 표시되는 수업 이름입니다. 구체적일수록 좋습니다.
                  </p>
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor="subject">과목 *</Label>
                  <Input
                    id="subject"
                    placeholder="예: 웹 개발, 데이터 분석, 정보보안"
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
                  <p className="text-xs text-muted-foreground">
                    AI가 카테고리에 맞는 코드 스니펫과 퀴즈를 생성합니다
                  </p>
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

                  {/* 추천 토픽 */}
                  {suggestedTopics.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1.5">추천 주제 (클릭하여 추가):</p>
                      <div className="flex flex-wrap gap-1">
                        {suggestedTopics
                          .filter((t) => !topics.includes(t))
                          .map((topic) => (
                            <Badge
                              key={topic}
                              variant="outline"
                              className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-colors text-xs"
                              onClick={() => handleAddSuggestedTopic(topic)}
                            >
                              + {topic}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-2.5 mt-2">
                    <Lightbulb className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700">
                      <strong>팁:</strong> 주제를 구체적으로 입력할수록 AI가 더 정확한 퀴즈를 만듭니다.
                      &ldquo;JPA&rdquo;보다 &ldquo;JPA N+1 문제&rdquo;가 더 좋습니다.
                    </p>
                  </div>
                </div>

                {/* Anonymous Mode */}
                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={anonymousMode}
                    onClick={() => setAnonymousMode(!anonymousMode)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      anonymousMode ? "bg-primary" : "bg-input"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform",
                        anonymousMode ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                      <Label>익명 모드</Label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      히트맵에서 수강생 이름 대신 &ldquo;익명 1, 익명 2...&rdquo;로 표시됩니다.
                      솔직한 응답을 유도할 때 유용합니다.
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

        {/* 우측: 가이드 사이드바 */}
        <div className="space-y-4">
          {/* 세션 생성 후 흐름 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-blue-500" />
                세션 생성 후 흐름
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { icon: Zap, label: "세션 생성", desc: "참여 코드 발급 대기", active: true },
                { icon: Users, label: "수업 시작", desc: "참여 코드 발급, 수강생 입장" },
                { icon: Brain, label: "AI 퀴즈 생성", desc: "주제 기반 자동 생성" },
                { icon: BarChart3, label: "실시간 분석", desc: "히트맵 + AI 코칭" },
              ].map((step, idx) => (
                <div key={step.label} className="flex items-start gap-2.5">
                  <div className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0",
                    step.active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* AI 퀴즈 유형 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-yellow-500" />
                AI가 만드는 퀴즈 유형
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { type: "출력 예측", desc: "코드 실행 결과를 맞추는 문제", color: "bg-blue-50 text-blue-700 border-blue-200" },
                { type: "버그 찾기", desc: "코드에서 오류를 찾는 문제", color: "bg-red-50 text-red-700 border-red-200" },
                { type: "빈칸 채우기", desc: "빠진 코드를 완성하는 문제", color: "bg-green-50 text-green-700 border-green-200" },
              ].map((q) => (
                <div key={q.type} className={cn("rounded-lg border p-2.5", q.color)}>
                  <p className="text-xs font-semibold">{q.type}</p>
                  <p className="text-[10px] opacity-80">{q.desc}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 좋은 제목 vs 나쁜 제목 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                좋은 제목 작성법
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-green-700">
                <span>O</span>
                <span>&ldquo;Spring Boot JPA 3주차 — 연관관계 매핑&rdquo;</span>
              </div>
              <div className="flex items-center gap-2 text-green-700">
                <span>O</span>
                <span>&ldquo;React 상태관리 — useState vs useReducer&rdquo;</span>
              </div>
              <div className="flex items-center gap-2 text-red-600">
                <span>X</span>
                <span className="line-through">&ldquo;3주차 수업&rdquo;</span>
              </div>
              <div className="flex items-center gap-2 text-red-600">
                <span>X</span>
                <span className="line-through">&ldquo;오늘 수업&rdquo;</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
