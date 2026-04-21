import { Suspense } from "react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { AuthButton } from "@/components/auth-button";

export function AppTopbar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b px-6">
      <div className="ml-auto flex items-center gap-4">
        <ThemeSwitcher />
        <Suspense>
          <AuthButton />
        </Suspense>
      </div>
    </header>
  );
}
