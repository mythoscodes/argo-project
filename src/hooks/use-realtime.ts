"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type ResponseRow = Database["public"]["Tables"]["responses"]["Row"];

type UseRealtimeResponsesReturn = {
  responses: ResponseRow[];
  isConnected: boolean;
};

export function useRealtimeResponses(
  sessionId: string
): UseRealtimeResponsesReturn {
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const supabase = useRef(createClient());

  useEffect(() => {
    if (!sessionId) return;

    // 초기 데이터 로드
    async function loadExisting() {
      const { data } = await supabase.current
        .from("responses")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (data) {
        setResponses(data);
      }
    }

    loadExisting();

    // 실시간 구독
    const channel = supabase.current
      .channel(`responses:session_id=eq.${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "responses",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setResponses((prev) => {
            // 중복 방지
            const exists = prev.some((r) => r.id === (payload.new as ResponseRow).id);
            if (exists) return prev;
            return [...prev, payload.new as ResponseRow];
          });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId]);

  return { responses, isConnected };
}
