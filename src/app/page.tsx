import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  switch (profile?.role) {
    case "teacher":
      redirect("/instructor");
      break;
    case "student":
      redirect("/student/join");
      break;
    case "owner":
      redirect("/owner");
      break;
    default:
      redirect("/login");
  }
}
