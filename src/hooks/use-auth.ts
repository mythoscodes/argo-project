"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface AuthState {
  userId: string | null;
  profile: Profile | null;
  isLoading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    userId: null,
    profile: null,
    isLoading: true,
  });

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState({ userId: null, profile: null, isLoading: false });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setState({
        userId: user.id,
        profile: profile ?? null,
        isLoading: false,
      });
    }

    loadProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
