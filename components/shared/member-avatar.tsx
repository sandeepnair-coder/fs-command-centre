import { cn } from "@/lib/utils";
import { getAvatarColor, getInitials } from "@/lib/utils/avatar";

export function MemberAvatar({
  name,
  avatarUrl,
  avatarColor,
  size = "md",
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = size === "sm" ? "size-6" : size === "lg" ? "size-10" : "size-8";
  const textSize = size === "sm" ? "text-[9px]" : size === "lg" ? "text-sm" : "text-[11px]";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn(dims, "rounded-full object-cover shrink-0", className)}
      />
    );
  }

  const color = getAvatarColor(name, avatarColor);
  return (
    <div className={cn(dims, "flex items-center justify-center rounded-full shrink-0 font-semibold", color.bg, color.text, textSize, className)}>
      {getInitials(name)}
    </div>
  );
}
