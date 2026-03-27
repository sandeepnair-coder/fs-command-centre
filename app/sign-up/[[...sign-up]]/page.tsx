import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Suspense fallback={<div className="text-muted-foreground text-sm">Loading...</div>}>
        <SignUp />
      </Suspense>
    </div>
  );
}
