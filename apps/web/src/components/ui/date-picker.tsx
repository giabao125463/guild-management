"use client";

import * as React from "react";
import { format, parse } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarDays, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function parseDateValue(value?: string): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function formatDateValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export interface DatePickerProps {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: "default" | "sm";
  clearable?: boolean;
  "aria-invalid"?: boolean;
}

export function DatePicker({
  id,
  value = "",
  onChange,
  placeholder = "Chọn ngày",
  disabled = false,
  className,
  size = "default",
  clearable = true,
  "aria-invalid": ariaInvalid,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selectedDate = parseDateValue(value);

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    onChange?.(formatDateValue(date));
    setOpen(false);
  };

  const handleClear = (event: React.MouseEvent) => {
    event.stopPropagation();
    onChange?.("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          className={cn(
            "group w-full justify-start gap-2 rounded-xl border-input bg-background px-3 font-normal shadow-sm transition-all hover:border-primary/40 hover:bg-accent/30 focus-visible:ring-primary/30",
            size === "default" ? "h-9 text-sm" : "h-8 text-xs",
            !selectedDate && "text-muted-foreground",
            ariaInvalid && "border-destructive focus-visible:ring-destructive/30",
            className,
          )}
        >
          <CalendarDays
            className={cn(
              "shrink-0 text-primary/80",
              size === "default" ? "h-4 w-4" : "h-3.5 w-3.5",
            )}
          />
          <span className="flex-1 truncate text-left">
            {selectedDate
              ? format(selectedDate, "dd/MM/yyyy", { locale: vi })
              : placeholder}
          </span>
          {clearable && selectedDate && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onChange?.("");
                }
              }}
              className="rounded-sm p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
              aria-label="Xóa ngày"
            >
              <X className={size === "default" ? "h-3.5 w-3.5" : "h-3 w-3"} />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          defaultMonth={selectedDate}
        />
      </PopoverContent>
    </Popover>
  );
}
