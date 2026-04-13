import type { Metadata } from "next";
import { redirect } from "next/navigation";
export const metadata: Metadata = { title: "수강생" };
import { createClient } from "@/lib/supabase/rsc";
import { Navbar } from "@/components/layout/navbar";

const ROLE_HOME: Record<string, string> = {
  owner: "/owner",
  teacher: "/instructor",
  mentor: "/mentor",
};

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "student") {
    redirect(ROLE_HOME[profile?.role ?? ""] ?? "/login");
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
    </>
  );
}
