import { cn } from "@/lib/utils";
import { getAvatarColor, getInitials } from "@/lib/utils/avatar";

export function ClientAvatar({
  name,
  logoUrl,
  size = "md",
  className,
}: {
  name: string | null;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = size === "sm" ? "size-7" : size === "lg" ? "size-11" : "size-9";
  const textSize = size === "sm" ? "text-[10px]" : size === "lg" ? "text-base" : "text-sm";

  if (!name) {
    return (
      <div className={cn(dims, "flex items-center justify-center rounded-full bg-muted text-muted-foreground shrink-0", textSize, className)}>
        ?
      </div>
    );
  }

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={cn(dims, "rounded-full object-cover shrink-0", className)}
      />
    );
  }

  const color = getAvatarColor(name);
  return (
    <div className={cn(dims, "flex items-center justify-center rounded-full shrink-0 font-bold", color.bg, color.text, textSize, className)}>
      {getInitials(name).charAt(0)}
    </div>
  );
}
