import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/rsc";
import { Navbar } from "@/components/layout/navbar";

const ROLE_HOME: Record<string, string> = {
  owner: "/owner",
  student: "/student/join",
  mentor: "/mentor",
};

export default async function InstructorLayout({
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

  if (!profile || profile.role !== "teacher") {
    redirect(ROLE_HOME[profile?.role ?? ""] ?? "/login");
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </>
  );
}
