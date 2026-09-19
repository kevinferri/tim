import { redirect } from "next/navigation";

// Cookie deletion must happen in a Route Handler (not a Server Component).
export default function ForceLogout() {
  redirect("/api/force-signout");
}
