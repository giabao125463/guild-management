import Link from "next/link";
import { Medal, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RankListItem {
  memberId?: string;
  name: string;
  internalMemberId?: string;
  value: number;
}

interface RankListProps {
  items: RankListItem[];
  valueLabel?: string;
  emptyMessage?: string;
  limit?: number;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
        <Trophy className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-400/15 text-slate-600 dark:text-slate-300">
        <Medal className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-600/15 text-orange-700 dark:text-orange-400">
        <Medal className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
      {rank}
    </span>
  );
}

export function RankList({
  items,
  valueLabel = "lần",
  emptyMessage = "Chưa có dữ liệu.",
  limit = 5,
}: RankListProps) {
  const visible = items.slice(0, limit);

  if (visible.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const maxValue = Math.max(...visible.map((item) => item.value), 1);

  return (
    <ul className="space-y-3">
      {visible.map((item, index) => {
        const rank = index + 1;
        const nameContent = (
          <div className="min-w-0">
            <p className="truncate font-medium">{item.name}</p>
            {item.internalMemberId && (
              <p className="truncate font-mono text-[10px] text-muted-foreground">
                {item.internalMemberId}
              </p>
            )}
          </div>
        );

        return (
          <li key={item.memberId ?? `${item.name}-${index}`} className="flex items-center gap-3">
            <RankBadge rank={rank} />
            <div className="min-w-0 flex-1">
              {item.memberId ? (
                <Link href={`/members/${item.memberId}`} className="block hover:text-primary">
                  {nameContent}
                </Link>
              ) : (
                nameContent
              )}
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    rank === 1 ? "bg-primary" : "bg-primary/50",
                  )}
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums">{item.value}</p>
              <p className="text-[10px] text-muted-foreground">{valueLabel}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
