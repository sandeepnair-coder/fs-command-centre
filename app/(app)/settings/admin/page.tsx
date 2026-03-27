import { Suspense } from "react";
import { getCurrentMember } from "@/lib/auth/getCurrentMember";
import { redirect } from "next/navigation";
import { getMembers } from "./actions";
import { MembersTable } from "./members-table";
import { InviteDialog } from "./invite-dialog";
import { Shield } from "lucide-react";
import { Separator } from "@/components/ui/separator";

async function AdminContent() {
  const member = await getCurrentMember();
  if (!member || member.role !== "owner") redirect("/tasks");

  const members = await getMembers();

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6" />
              <h1 className="text-2xl font-bold tracking-tight">
                Admin Panel
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage workspace members and their roles.
            </p>
          </div>
          <InviteDialog />
        </div>
      </div>
      <Separator className="mb-6" />
      <MembersTable members={members} currentMemberId={member.id} />
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="p-4 text-muted-foreground">Loading…</div>}>
      <AdminContent />
    </Suspense>
  );
}
