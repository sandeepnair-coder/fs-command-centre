import { Suspense } from "react";
import { Input } from "@/components/ui/input";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ColorThemeSwitcher } from "@/components/color-theme-switcher";
import { AuthButton } from "@/components/auth-button";
import { Search } from "lucide-react";

export function AppTopbar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b px-6">
      <h1 className="hidden text-sm font-semibold sm:block whitespace-nowrap">
        Fynd Studio &ndash; Command Centre
      </h1>
      <div className="relative ml-auto flex max-w-sm flex-1 items-center">
        <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          className="pl-8"
          disabled
        />
      </div>
      <ColorThemeSwitcher />
      <ThemeSwitcher />
      <Suspense>
        <AuthButton />
      </Suspense>
    </header>
  );
}
