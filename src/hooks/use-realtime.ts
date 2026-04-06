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
          setResponses((prev) => [...prev, payload.new as ResponseRow]);
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
