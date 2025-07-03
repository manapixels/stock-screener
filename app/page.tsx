import { redirect } from "next/navigation";

export default function Home() {
  // Use Next.js 13+ redirect for server-side redirects
  redirect("/dashboard");
}
