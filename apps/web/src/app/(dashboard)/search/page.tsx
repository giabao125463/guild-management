import { Suspense } from "react";
import { SearchPageContent } from "./search-content";
import { Skeleton } from "@/components/ui/skeleton";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
