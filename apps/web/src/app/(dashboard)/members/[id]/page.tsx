"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { getGameClassLabel } from "@guild/shared-utils";
import { useMember, useMemberTimeline } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function MemberDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: member, isLoading } = useMember(id);
  const { data: timeline } = useMemberTimeline(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!member) return null;

  return (
    <div className="space-y-6">
      <PageHeader title={member.currentName} description="Hồ sơ thành viên và lịch sử">
        <Button variant="outline" asChild>
          <Link href="/members">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hồ sơ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Mã nội bộ</p>
                <p className="font-mono">{member.internalMemberId}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Lớp</p>
                <p>{getGameClassLabel(member.currentClass)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Đóng góp (số trận BC)</p>
                <p>{member.contributionPoint}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tham gia</p>
                <p>{member.guildWarAttendanceCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Kim Lang</p>
                <p>{member.kimLangUserGroup?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Team</p>
                <p>{member.userGroups.TEAM?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tình duyên</p>
                <p>{member.userGroups.TINH_DUYEN?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Quan hệ</p>
                <p>{member.relationship ?? "—"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant={member.isActive ? "success" : "secondary"}>
                {member.isActive ? "Hoạt động" : "Không hoạt động"}
              </Badge>
              {member.isBlacklisted && <Badge variant="destructive">Danh sách đen</Badge>}
            </div>
            {member.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {member.tags.map((tag) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            )}
            {member.note && (
              <div>
                <p className="text-sm text-muted-foreground">Ghi chú</p>
                <p className="text-sm">{member.note}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dòng thời gian</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline && timeline.length > 0 ? (
              <div className="space-y-4">
                {timeline.map((event, index) => (
                  <div key={event.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">{event.eventType.replace(/_/g, " ")}</p>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        {(event.oldValue || event.newValue) && (
                          <p className="mt-1 font-mono text-xs text-muted-foreground">
                            {event.oldValue} → {event.newValue}
                          </p>
                        )}
                      </div>
                      <time className="shrink-0 text-xs text-muted-foreground">
                        {format(new Date(event.createdAt), "dd/MM/yyyy HH:mm")}
                      </time>
                    </div>
                    {index < timeline.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có sự kiện nào.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
