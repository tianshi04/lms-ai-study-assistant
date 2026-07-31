import { cookies } from "next/headers";
import { HomeDashboardSwitch } from "@/components/dashboard/HomeDashboardSwitch";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const rawUserName = cookieStore.get("user_name")?.value;
  const rawUserRole = cookieStore.get("user_role")?.value;
  const userName = rawUserName ? decodeURIComponent(rawUserName) : undefined;

  return (
    <HomeDashboardSwitch
      initialToken={token}
      initialUserName={userName}
      initialUserRole={rawUserRole}
    />
  );
}
