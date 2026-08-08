import { GISScriptLoader } from "@/components/auth/GISScriptLoader";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GISScriptLoader />
      {children}
    </>
  );
}
