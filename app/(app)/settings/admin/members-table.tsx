"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, ShieldCheck, UserMinus, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getAvatarColor, getInitials } from "@/lib/utils/avatar";
import { changeMemberRole, toggleMemberStatus } from "./actions";
import type { Member, MemberRole } from "@/lib/types/members";

const roleStyles: Record<string, string> = {
  owner: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  member: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  finance: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

const statusStyles: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  invited: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  disabled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

type MembersTableProps = {
  members: Member[];
  currentMemberId: string;
};

export function MembersTable({ members, currentMemberId }: MembersTableProps) {
  const [confirmDisable, setConfirmDisable] = useState<Member | null>(null);

  async function handleRoleChange(memberId: string, role: MemberRole) {
    try {
      await changeMemberRole(memberId, role);
      toast.success("Role updated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update role"
      );
    }
  }

  async function handleToggleStatus(member: Member) {
    const disable = member.status !== "disabled";
    try {
      await toggleMemberStatus(member.id, disable);
      toast.success(disable ? "Member disabled" : "Member enabled");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status"
      );
    }
    setConfirmDisable(null);
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => {
              const isSelf = m.id === currentMemberId;
              const displayName =
                m.profiles?.full_name || (m.user_id ? "—" : "Pending");
              const avatarName = m.profiles?.full_name || m.email;
              const color = getAvatarColor(avatarName);

              return (
                <TableRow key={m.id}>
                  <TableCell>
                    <Avatar className="h-7 w-7">
                      {m.profiles?.avatar_url && (
                        <AvatarImage src={m.profiles.avatar_url} alt={displayName} />
                      )}
                      <AvatarFallback className={cn("text-[10px] font-semibold", color.bg, color.text)}>
                        {getInitials(avatarName)}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{m.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {displayName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("capitalize", roleStyles[m.role])}>
                      {m.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("capitalize", statusStyles[m.status])}>
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {!isSelf && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <ShieldCheck className="mr-2 h-4 w-4" />
                              Change Role
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {(["member", "finance", "owner"] as MemberRole[]).map(
                                (r) => (
                                  <DropdownMenuItem
                                    key={r}
                                    disabled={m.role === r}
                                    onClick={() => handleRoleChange(m.id, r)}
                                  >
                                    {r.charAt(0).toUpperCase() + r.slice(1)}
                                  </DropdownMenuItem>
                                )
                              )}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          {m.status === "disabled" ? (
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(m)}
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              Enable Member
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setConfirmDisable(m)}
                            >
                              <UserMinus className="mr-2 h-4 w-4" />
                              Disable Member
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {members.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No members yet. Invite someone to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!confirmDisable}
        onOpenChange={(open) => !open && setConfirmDisable(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable member?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDisable?.email} will be signed out and blocked from
              accessing the workspace. You can re-enable them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDisable && handleToggleStatus(confirmDisable)}
            >
              Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
