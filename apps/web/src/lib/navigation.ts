import type { ComponentType } from "react";
import { Permission } from "@guild/shared-types";
import {
  BarChart3,
  Folders,
  Gift,
  LayoutDashboard,
  ScrollText,
  Search,
  Shield,
  Swords,
  Users,
  Castle,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  permissions: Permission[];
}

export const navItems: NavItem[] = [
  {
    title: "Tổng quan",
    href: "/",
    icon: LayoutDashboard,
    permissions: [Permission.REPORT_READ],
  },
  {
    title: "Thành viên",
    href: "/members",
    icon: Users,
    permissions: [Permission.MEMBER_READ],
  },
  {
    title: "User Group",
    href: "/user-groups",
    icon: Folders,
    permissions: [Permission.USER_GROUP_READ],
  },
  {
    title: "Bang chiến",
    href: "/guild-war",
    icon: Swords,
    permissions: [Permission.GUILDWAR_READ],
  },
  {
    title: "Vòng quay",
    href: "/giveaway",
    icon: Gift,
    permissions: [Permission.GIVEAWAY_READ],
  },
  {
    title: "Phụ bản",
    href: "/dungeon",
    icon: Castle,
    permissions: [Permission.DUNGEON_READ],
  },
  {
    title: "Báo cáo",
    href: "/reports",
    icon: BarChart3,
    permissions: [Permission.REPORT_READ],
  },
  {
    title: "Người dùng",
    href: "/users",
    icon: Shield,
    permissions: [Permission.USER_READ],
  },
  {
    title: "Nhật ký",
    href: "/audit",
    icon: ScrollText,
    permissions: [Permission.AUDIT_READ],
  },
  {
    title: "Tìm kiếm",
    href: "/search",
    icon: Search,
    permissions: [Permission.MEMBER_READ],
  },
];

export const navGroups = [
  { label: "Tổng quan", items: navItems.slice(0, 1) },
  { label: "Vận hành", items: navItems.slice(1, 6) },
  { label: "Quản trị", items: navItems.slice(6) },
];
