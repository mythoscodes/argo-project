"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

interface DeltaChartProps {
  sessionId: string;
  currentRound: number;
}

interface DeltaData {
  topic: string;
  previous: number;
  current: number;
  delta: number;
}

export function DeltaChart({ sessionId, currentRound }: DeltaChartProps) {
  const [data, setData] = useState<DeltaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDelta() {
      try {
        const response = await fetch(
          `/api/ai/analysis?sessionId=${sessionId}&round=${currentRound}`
        );
        if (response.ok) {
          const result = await response.json();
          const analysis = result.data;
          if (analysis?.understanding_scores && analysis?.delta) {
            const deltaEntries: DeltaData[] = Object.entries(analysis.understanding_scores).map(
              ([topic, score]) => ({
                topic,
                current: score as number,
                previous: (score as number) - ((analysis.delta as Record<string, number>)[topic] ?? 0),
                delta: (analysis.delta as Record<string, number>)[topic] ?? 0,
              })
            );
            setData(deltaEntries);
          }
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadDelta();
  }, [sessionId, currentRound]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        아직 델타 데이터가 없습니다
      </p>
    );
  }

  const avgDelta = Math.round(data.reduce((sum, d) => sum + d.delta, 0) / data.length);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">평균 개선율</span>
        <Badge variant={avgDelta > 0 ? "success" : avgDelta < 0 ? "destructive" : "secondary"}>
          {avgDelta > 0 ? "+" : ""}{avgDelta}%
        </Badge>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ left: 60, right: 20, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[-30, 30]} tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`} />
          <YAxis type="category" dataKey="topic" width={60} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value) => [`${Number(value) > 0 ? "+" : ""}${value}%`, "변화"]}
            labelStyle={{ fontWeight: 600 }}
          />
          <Bar dataKey="delta" radius={[0, 4, 4, 0]}>
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.delta >= 0 ? "#22c55e" : "#ef4444"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
