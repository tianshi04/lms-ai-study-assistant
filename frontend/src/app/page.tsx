import { cookies } from "next/headers";
import { PublicLanding } from "@/components/home/PublicLanding";
import { LearningDashboard } from "@/components/home/LearningDashboard";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const rawUserName = cookieStore.get("user_name")?.value;
  const userName = rawUserName || "Học viên";

  // Decode the URL encoded cookie value if present
  const decodedUserName = decodeURIComponent(userName);

  if (token && rawUserName) {
    return <LearningDashboard userName={decodedUserName} />;
  }

  return <PublicLanding />;
}

