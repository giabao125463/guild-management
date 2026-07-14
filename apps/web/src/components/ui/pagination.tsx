import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  const pages = React.useMemo(() => {
    const items: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    items.push(1);
    if (page > 3) items.push("ellipsis");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      items.push(i);
    }
    if (page < totalPages - 2) items.push("ellipsis");
    items.push(totalPages);
    return items;
  }, [page, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <nav className={cn("flex items-center justify-center gap-1", className)} aria-label="Phân trang">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Trang trước"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {pages.map((p, idx) =>
        p === "ellipsis" ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="icon"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </Button>
        ),
      )}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Trang sau"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
