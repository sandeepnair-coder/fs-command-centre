import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "./ui/button";

export async function AuthButton() {
  const user = await currentUser();

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm hidden sm:block">
          {user.fullName || user.emailAddresses[0]?.emailAddress || ""}
        </span>
        <UserButton />
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant="default">
        <Link href="/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
