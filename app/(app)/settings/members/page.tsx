"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Plus,
  MoreHorizontal,
  Shield,
  Crown,
  UserCheck,
  Eye,
  UserX,
  Trash2,
} from "lucide-react";
import { getMembers, inviteMember, changeMemberRole, toggleMemberStatus, removeMember } from "./actions";
import type { Member, MemberRole } from "@/lib/types/members";
import { ROLE_CONFIG } from "@/lib/types/members";
import { getInitials } from "@/lib/utils/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const roleIcons: Record<MemberRole, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  member: UserCheck,
  viewer: Eye,
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("member");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    getMembers()
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const member = await inviteMember(inviteEmail.trim(), inviteRole);
      setMembers((prev) => [...prev, member]);
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("member");
      toast.success(`Invited ${inviteEmail}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send invite.");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: MemberRole) {
    try {
      await changeMemberRole(memberId, newRole);
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
      toast.success("Role updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't change role.");
    }
  }

  async function handleToggleStatus(memberId: string) {
    try {
      const newStatus = await toggleMemberStatus(memberId);
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, status: newStatus as Member["status"] } : m))
      );
      toast.success(`Member ${newStatus === "active" ? "activated" : "deactivated"}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update status.");
    }
  }

  async function handleRemove(memberId: string) {
    try {
      await removeMember(memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast.success("Member removed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove member.");
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h1 className="text-xl font-bold tracking-tight">Team Members</h1>
            {!loading && (
              <Badge variant="secondary" className="text-xs">{members.length}</Badge>
            )}
          </div>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Invite Member
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage who has access to your studio and what they can do.
        </p>
      </div>

      <Separator className="mb-4" />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3" />
          <p className="text-sm font-medium">No members yet</p>
          <p className="text-xs mt-1">You&apos;ll appear here after your first visit is synced.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const RoleIcon = roleIcons[m.role] || UserCheck;
                const config = ROLE_CONFIG[m.role];
                const name = m.full_name || m.profiles?.full_name || m.email.split("@")[0];

                return (
                  <TableRow key={m.id} className={m.status === "disabled" ? "opacity-50" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {(m.avatar_url || m.profiles?.avatar_url) && (
                            <AvatarImage src={m.avatar_url || m.profiles?.avatar_url || ""} />
                          )}
                          <AvatarFallback className="text-[10px] font-semibold bg-muted">
                            {getInitials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{name}</p>
                          <p className="text-[11px] text-muted-foreground">{m.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-[10px] gap-1", config.badge)}>
                        <RoleIcon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.status === "active" ? "default" : "outline"}
                        className={cn("text-[10px]",
                          m.status === "active" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
                          m.status === "invited" && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                          m.status === "disabled" && "bg-gray-100 text-gray-500",
                        )}>
                        {m.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {m.role !== "owner" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleRoleChange(m.id, "admin")}>
                              <Shield className="mr-2 h-3.5 w-3.5" /> Make Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRoleChange(m.id, "member")}>
                              <UserCheck className="mr-2 h-3.5 w-3.5" /> Make Member
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRoleChange(m.id, "viewer")}>
                              <Eye className="mr-2 h-3.5 w-3.5" /> Make Viewer
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleStatus(m.id)}>
                              <UserX className="mr-2 h-3.5 w-3.5" />
                              {m.status === "active" ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleRemove(m.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite someone to Fynd Studio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Email address</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as MemberRole)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — Full access, can manage team</SelectItem>
                  <SelectItem value="member">Member — Can manage tasks & boards</SelectItem>
                  <SelectItem value="viewer">Viewer — Read-only, for clients/guests</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? "Inviting..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
