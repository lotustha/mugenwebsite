import { redirect } from "next/navigation";

// Signup is disabled — bootstrap admins with `npm run create-admin`
export default function SignupPage() {
  redirect("/admin/login");
}
