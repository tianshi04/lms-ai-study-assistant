import type { ReactNode } from "react";
import { Surface } from "@/components/ui/Surface";

interface AdminSectionProps {
  /** Unique prefix; the heading gets `${id}-heading` so the section is labelled for screen readers. */
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}

/** Titled card shared by the admin dashboard blocks. */
export function AdminSection({ id, title, description, children }: AdminSectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section aria-labelledby={headingId}>
      <Surface variant="low" shape="2xl" className="p-6 space-y-4">
        <div className="pb-4 border-b border-border">
          <h2 id={headingId} className="text-lg font-extrabold text-foreground">
            {title}
          </h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {children}
      </Surface>
    </section>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{message}</p>;
}
