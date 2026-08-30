import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function MobileLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/mobile")
  if (session.user.role !== "consultant") redirect("/dashboard")

  return children
}
