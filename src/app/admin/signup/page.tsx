import { redirect } from "next/navigation";

// Signup is disabled — admins are created directly in Supabase
export default function SignupPage() {
  redirect("/admin/login");
}
