// 6 distinct colorful avatar themes — deterministic per name
const AVATAR_COLORS = [
  { bg: "bg-violet-500", text: "text-white" },
  { bg: "bg-emerald-500", text: "text-white" },
  { bg: "bg-sky-500", text: "text-white" },
  { bg: "bg-amber-400", text: "text-white" },
  { bg: "bg-rose-500", text: "text-white" },
  { bg: "bg-indigo-600", text: "text-white" },
] as const;

export type AvatarColor = (typeof AVATAR_COLORS)[number];

export function getAvatarColor(name: string, savedColor?: string | null): AvatarColor {
  if (savedColor) {
    const found = (AVATAR_COLORS as readonly AvatarColor[]).find((c) => c.bg === savedColor);
    if (found) return found;
  }
  if (!name) return AVATAR_COLORS[0];
  const code = Array.from(name).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
