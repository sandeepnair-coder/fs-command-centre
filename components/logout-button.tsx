"use client";

import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const { signOut } = useClerk();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => signOut({ redirectUrl: "/sign-in" })}
    >
      Logout
    </Button>
  );
}
