export function formatRoleName(role: string): string {
  if (!role) return "Learner";
  const r = role.toUpperCase();
  if (r.includes("LEARNER") || r.includes("STUDENT") || r === "1") return "Learner";
  if (r.includes("INSTRUCTOR") || r === "2") return "Instructor";
  if (r.includes("TA") || r.includes("TEACHING ASSISTANT") || r === "3")
    return "Teaching Assistant";
  if (r.includes("SUPER_ADMIN") || r.includes("ORG_ADMIN") || r === "ADMIN") return "Admin";
  return role;
}
