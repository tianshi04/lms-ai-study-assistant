import { getAuthServer } from "@/lib/auth_server";
import { HomeDashboardSwitch } from "@/components/dashboard/HomeDashboardSwitch";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function Home() {
  const session = await getAuthServer();

  return (
    <HomeDashboardSwitch
      initialToken={session.accessToken || undefined}
      initialUserName={session.userName || undefined}
      initialUserRole={session.userRole || undefined}
    />
  );
}
