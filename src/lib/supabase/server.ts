import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // ⚠️ setAll 미구현: 모든 API Route는 auth.getUser()만 사용(리프레시 없음).
        // 세션 리프레시는 middleware.ts가 전담. Server Component는 read-only.
        // Route Handler에 auth.updateUser/signOut/refreshSession/setSession 등을 추가하려면
        // 이 파일에 setAll을 다시 구현해야 함 (Context7 /supabase/ssr Pattern 1/2).
      },
    }
  );
}
