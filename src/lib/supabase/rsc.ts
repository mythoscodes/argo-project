import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

// Server Component 전용 클라이언트 (Context7 /supabase/ssr Pattern 3)
// Route Handler용은 server.ts 사용 — setAll이 필요한 경우(getSession 등) 반드시 server.ts로.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        // setAll 생략 — Server Component는 read-only (Next.js 제약).
        // 세션 리프레시는 middleware.ts의 createServerClient가 전담.
      },
    }
  );
}
