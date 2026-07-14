import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  href?: string;
  accent?: "primary" | "blue" | "amber" | "violet" | "rose";
  footer?: React.ReactNode;
}

const accentStyles = {
  primary: {
    icon: "bg-primary/10 text-primary",
    ring: "ring-primary/20",
  },
  blue: {
    icon: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    ring: "ring-sky-500/20",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/20",
  },
  violet: {
    icon: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    ring: "ring-violet-500/20",
  },
  rose: {
    icon: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    ring: "ring-rose-500/20",
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  accent = "primary",
  footer,
}: StatCardProps) {
  const styles = accentStyles[accent];

  const content = (
    <Card className={cn("relative overflow-hidden transition-shadow hover:shadow-md", href && "group cursor-pointer")}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {footer}
          </div>
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1",
              styles.icon,
              styles.ring,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {href && (
          <ArrowUpRight className="absolute right-4 top-4 h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
