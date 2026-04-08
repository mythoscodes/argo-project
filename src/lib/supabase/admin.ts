import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role 클라이언트 — RLS를 우회하여 서버사이드 관리 작업에 사용.
 * API Route 내부에서만 호출할 것. 클라이언트 번들에 포함 금지.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL 또는 SUPABASE_SECRET_KEY 환경변수가 설정되지 않았습니다.");
  }

  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
