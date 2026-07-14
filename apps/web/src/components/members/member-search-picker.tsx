"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import type { MemberDto } from "@guild/shared-types";
import { getGameClassLabel } from "@guild/shared-utils";
import { useMembers } from "@/hooks/use-api";
import { useDebounce } from "@/hooks/use-debounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const MIN_SEARCH_LENGTH = 2;

function MemberOption({
  member,
  onSelect,
}: {
  member: MemberDto;
  onSelect: (member: MemberDto) => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onSelect(member)}
    >
      <span className="font-mono text-xs text-muted-foreground">{member.internalMemberId}</span>
      <span className="font-medium">{member.currentName}</span>
      <span className="ml-auto text-xs text-muted-foreground">
        {getGameClassLabel(member.currentClass)}
      </span>
    </button>
  );
}

function MemberSearchResults({
  query,
  excludeIds,
  onSelect,
}: {
  query: string;
  excludeIds?: Set<string>;
  onSelect: (member: MemberDto) => void;
}) {
  const debouncedQuery = useDebounce(query.trim(), 300);
  const enabled = debouncedQuery.length >= MIN_SEARCH_LENGTH;

  const { data, isLoading, isFetching } = useMembers({
    page: 1,
    limit: 20,
    search: enabled ? debouncedQuery : undefined,
    isActive: true,
  });

  if (!enabled) {
    return (
      <p className="px-3 py-2 text-xs text-muted-foreground">
        Nhập ít nhất {MIN_SEARCH_LENGTH} ký tự để tìm thành viên.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </div>
    );
  }

  const members = (data?.data ?? []).filter((m) => !excludeIds?.has(m.id));

  if (members.length === 0) {
    return (
      <p className="px-3 py-2 text-xs text-muted-foreground">
        {isFetching ? "Đang tìm..." : "Không tìm thấy thành viên."}
      </p>
    );
  }

  return (
    <ScrollArea className="max-h-56">
      <div className="p-1">
        {members.map((member) => (
          <MemberOption key={member.id} member={member} onSelect={onSelect} />
        ))}
      </div>
    </ScrollArea>
  );
}

export function MemberSearchPicker({
  value,
  selectedMember,
  onChange,
  placeholder = "Tìm theo tên hoặc ID...",
  className,
  disabled,
}: {
  value?: string | null;
  selectedMember?: Pick<MemberDto, "id" | "internalMemberId" | "currentName"> | null;
  onChange: (memberId: string | null, member?: MemberDto | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (member: MemberDto) => {
    onChange(member.id, member);
    setQuery("");
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null, null);
    setQuery("");
    setOpen(false);
  };

  if (value && selectedMember) {
    return (
      <div
        className={cn(
          "flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm",
          className,
        )}
      >
        <span className="font-mono text-xs text-muted-foreground">
          {selectedMember.internalMemberId}
        </span>
        <span className="truncate font-medium">{selectedMember.currentName}</span>
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="ml-auto h-6 w-6 shrink-0"
            onClick={handleClear}
            aria-label="Bỏ chọn"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          className="pl-9"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
      </div>
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          <MemberSearchResults query={query} onSelect={handleSelect} />
        </div>
      )}
    </div>
  );
}

export function MemberSearchMultiPicker({
  value,
  selectedMembers,
  onChange,
  excludeIds,
  placeholder = "Tìm theo tên hoặc ID...",
  className,
  disabled,
}: {
  value: string[];
  selectedMembers: Pick<MemberDto, "id" | "internalMemberId" | "currentName">[];
  onChange: (memberIds: string[], members: Pick<MemberDto, "id" | "internalMemberId" | "currentName">[]) => void;
  excludeIds?: string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const excludeSet = React.useMemo(
    () => new Set([...value, ...(excludeIds ?? [])]),
    [value, excludeIds],
  );

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (member: MemberDto) => {
    if (value.includes(member.id)) return;
    onChange(
      [...value, member.id],
      [...selectedMembers, member],
    );
    setQuery("");
  };

  const handleRemove = (memberId: string) => {
    onChange(
      value.filter((id) => id !== memberId),
      selectedMembers.filter((m) => m.id !== memberId),
    );
  };

  return (
    <div ref={containerRef} className={cn("space-y-2", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          className="pl-9"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
        {open && !disabled && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
            <MemberSearchResults
              query={query}
              excludeIds={excludeSet}
              onSelect={handleSelect}
            />
          </div>
        )}
      </div>

      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedMembers.map((member) => (
            <Badge key={member.id} variant="secondary" className="gap-1 pr-1">
              <span className="font-mono text-[10px]">{member.internalMemberId}</span>
              <span>{member.currentName}</span>
              {!disabled && (
                <button
                  type="button"
                  className="rounded-sm p-0.5 hover:bg-muted"
                  onClick={() => handleRemove(member.id)}
                  aria-label={`Bỏ ${member.currentName}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
