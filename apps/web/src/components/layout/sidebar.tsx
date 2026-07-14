"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";
import type { Permission } from "@guild/shared-types";
import { hasAnyPermission } from "@guild/shared-utils";
import { useAuthStore } from "@/lib/auth-store";
import { navGroups } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const EMPTY_PERMISSIONS: Permission[] = [];

export function Sidebar() {
  const pathname = usePathname();
  const permissions = useAuthStore((s) => s.user?.permissions ?? EMPTY_PERMISSIONS);

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-accent">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold">Quản lý bang</p>
          <p className="text-xs text-sidebar-muted">Hệ thống quản lý</p>
        </div>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) =>
            hasAnyPermission(permissions, item.permissions),
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label}>
              <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-sidebar-muted">
                {group.label}
              </p>
              <ul className="space-y-1">
                {visibleItems.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-white"
                            : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-white",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
