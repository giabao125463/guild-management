"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  GAME_CLASSES,
  GAME_CLASS_LABELS,
  GameClass,
  UserGroupType,
} from "@guild/shared-types";
import { useCreateMember, useUserGroupOptions } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";

const schema = z.object({
  internalMemberId: z.string().min(1, "Bắt buộc"),
  currentName: z.string().min(1, "Bắt buộc"),
  currentClass: z.nativeEnum(GameClass, { required_error: "Bắt buộc" }),
  joinDate: z.string().optional(),
  kimLangUserGroupId: z.string().optional(),
  teamUserGroupId: z.string().optional(),
  tinhDuyenUserGroupId: z.string().optional(),
  relationship: z.string().optional(),
  realLifeRelationship: z.string().optional(),
  tags: z.string().optional(),
  note: z.string().optional(),
  contributionPoint: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
  isBlacklisted: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

function UserGroupSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: { id: string; name: string }[];
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={value || "none"}
        onValueChange={(v) => onChange(v === "none" ? undefined : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder={`Chọn ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Chưa gán</SelectItem>
          {options.map((group) => (
            <SelectItem key={group.id} value={group.id}>
              {group.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function NewMemberPage() {
  const router = useRouter();
  const createMember = useCreateMember();
  const { data: kimLangGroups } = useUserGroupOptions(UserGroupType.KIM_LANG);
  const { data: teamGroups } = useUserGroupOptions(UserGroupType.TEAM);
  const { data: tinhDuyenGroups } = useUserGroupOptions(UserGroupType.TINH_DUYEN);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      isActive: true,
      isBlacklisted: false,
      contributionPoint: 0,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        internalMemberId: data.internalMemberId,
        currentName: data.currentName,
        currentClass: data.currentClass,
        joinDate: data.joinDate,
        kimLangUserGroupId: data.kimLangUserGroupId ?? null,
        teamUserGroupId: data.teamUserGroupId ?? null,
        tinhDuyenUserGroupId: data.tinhDuyenUserGroupId ?? null,
        relationship: data.relationship,
        realLifeRelationship: data.realLifeRelationship,
        note: data.note,
        contributionPoint: data.contributionPoint,
        isActive: data.isActive,
        isBlacklisted: data.isBlacklisted,
        tags: data.tags
          ? data.tags.split(/[,;|]/).map((t) => t.trim()).filter(Boolean)
          : [],
      };
      await createMember.mutateAsync(payload);
      toast.success("Đã tạo thành viên");
      router.push("/members");
    } catch {
      toast.error("Tạo thành viên thất bại");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Thêm thành viên mới" description="Thêm thành viên mới vào bang" />

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="internalMemberId">Mã nội bộ</Label>
                <Input id="internalMemberId" className="font-mono" {...register("internalMemberId")} />
                {errors.internalMemberId && (
                  <p className="text-sm text-destructive">{errors.internalMemberId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentName">Tên</Label>
                <Input id="currentName" {...register("currentName")} />
                {errors.currentName && (
                  <p className="text-sm text-destructive">{errors.currentName.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Lớp</Label>
                <Select onValueChange={(v) => setValue("currentClass", v as GameClass)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn lớp" />
                  </SelectTrigger>
                  <SelectContent>
                    {GAME_CLASSES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {GAME_CLASS_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.currentClass && (
                  <p className="text-sm text-destructive">{errors.currentClass.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="joinDate">Ngày vào bang</Label>
                <DatePicker
                  id="joinDate"
                  value={watch("joinDate") ?? ""}
                  onChange={(v) => setValue("joinDate", v)}
                  placeholder="Chọn ngày vào bang"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <UserGroupSelect
                label="Kim Lang"
                value={watch("kimLangUserGroupId")}
                options={kimLangGroups ?? []}
                onChange={(v) => setValue("kimLangUserGroupId", v)}
              />
              <UserGroupSelect
                label="Team"
                value={watch("teamUserGroupId")}
                options={teamGroups ?? []}
                onChange={(v) => setValue("teamUserGroupId", v)}
              />
              <UserGroupSelect
                label="Tình duyên"
                value={watch("tinhDuyenUserGroupId")}
                options={tinhDuyenGroups ?? []}
                onChange={(v) => setValue("tinhDuyenUserGroupId", v)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contributionPoint">Đóng góp (số trận BC)</Label>
              <Input id="contributionPoint" type="number" {...register("contributionPoint")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Thẻ (phân cách bằng dấu phẩy)</Label>
              <Input id="tags" {...register("tags")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Ghi chú</Label>
              <Textarea id="note" {...register("note")} />
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={watch("isActive")}
                  onCheckedChange={(v) => setValue("isActive", Boolean(v))}
                />
                Hoạt động
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={watch("isBlacklisted")}
                  onCheckedChange={(v) => setValue("isBlacklisted", Boolean(v))}
                />
                Danh sách đen
              </label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={createMember.isPending}>
                {createMember.isPending ? "Đang tạo..." : "Tạo thành viên"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Hủy
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
