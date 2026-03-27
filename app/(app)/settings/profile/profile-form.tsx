"use client";

import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getAvatarColor, getInitials } from "@/lib/utils/avatar";
import { updateProfileName, uploadAvatar, removeAvatar, updateAvatarColor } from "./actions";

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  avatar_color: string | null;
  email: string;
};

const AVATAR_PRESETS = [
  { bg: "bg-violet-500", text: "text-white" },
  { bg: "bg-emerald-500", text: "text-white" },
  { bg: "bg-sky-500", text: "text-white" },
  { bg: "bg-amber-400", text: "text-white" },
  { bg: "bg-rose-500", text: "text-white" },
  { bg: "bg-indigo-600", text: "text-white" },
] as const;

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const [savedColor, setSavedColor] = useState<string | null>(profile?.avatar_color ?? null);
  const [savingName, setSavingName] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = getInitials(fullName || profile?.email || "?");
  const autoColor = getAvatarColor(fullName || profile?.email || "");
  const activeColorBg = savedColor ?? autoColor.bg;
  const color = savedColor
    ? (AVATAR_PRESETS.find((p) => p.bg === savedColor) ?? autoColor)
    : autoColor;

  async function handleSaveName() {
    if (!fullName.trim()) {
      toast.error("Name can't be empty — gotta call you something!");
      return;
    }
    setSavingName(true);
    try {
      await updateProfileName(fullName);
      toast.success("Name updated. Looking good!");
    } catch {
      toast.error("Couldn't update name. Give it another shot.");
    } finally {
      setSavingName(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error("That image is a bit too heavy. Keep it under 500 KB — try compressing it first.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.set("avatar", file);
      const url = await uploadAvatar(formData);
      setAvatarUrl(url);
      setSavedColor(null);
      toast.success("Photo updated. You look great!");
    } catch {
      toast.error("Upload failed. Try a smaller image?");
    } finally {
      setUploadingPhoto(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemovePhoto() {
    try {
      await removeAvatar();
      setAvatarUrl(null);
      toast.success("Photo removed. Back to the colorful initials!");
    } catch {
      toast.error("Couldn't remove photo. Try again?");
    }
  }

  return (
    <div className="max-w-lg space-y-8">
      {/* ─── Avatar ─── */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Profile photo</Label>
        <div className="flex items-center gap-5">
          <div className="relative group">
            <Avatar className="h-20 w-20">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
              <AvatarFallback className={cn("text-2xl font-bold", color.bg, color.text)}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Camera className="h-5 w-5 text-white" />
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              JPG, PNG or WebP · max 500 KB
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? "Uploading..." : "Upload photo"}
              </Button>
              {avatarUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={handleRemovePhoto}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Preset color swatches */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Or pick a vibe:</p>
              <div className="flex gap-1.5">
                {AVATAR_PRESETS.map((preset) => (
                  <Tooltip key={preset.bg} content={preset.bg.replace("bg-", "")}>
                    <button
                      className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-transform hover:scale-110",
                        preset.bg,
                        preset.text,
                        activeColorBg === preset.bg && "ring-2 ring-offset-2 ring-foreground scale-110"
                      )}
                      onClick={async () => {
                        setSavedColor(preset.bg);
                        setAvatarUrl(null);
                        await updateAvatarColor(preset.bg);
                        toast.success("Vibe color saved!");
                      }}
                    >
                      {initials.slice(0, 1)}
                    </button>
                  </Tooltip>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Pick a color — it shows on your cards and profile.
              </p>
            </div>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handlePhotoUpload}
        />
      </div>

      <Separator />

      {/* ─── Name ─── */}
      <div className="space-y-2">
        <Label htmlFor="full-name" className="text-sm font-medium">
          Display name
        </Label>
        <p className="text-xs text-muted-foreground">
          This is how you show up in tasks, comments, and everywhere else.
        </p>
        <div className="flex gap-2">
          <Input
            id="full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            className="max-w-xs"
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); }}
          />
          <Button
            onClick={handleSaveName}
            disabled={savingName || fullName.trim() === (profile?.full_name ?? "")}
            size="sm"
          >
            {savingName ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <Separator />

      {/* ─── Email (read-only) ─── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Email address</Label>
        <p className="text-xs text-muted-foreground">
          Used for login and invites. Contact your workspace admin to change it.
        </p>
        <Input
          value={profile?.email ?? ""}
          disabled
          className="max-w-xs bg-muted/50 cursor-not-allowed"
        />
      </div>
    </div>
  );
}

// Tiny inline tooltip wrapper
function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <div title={content} className="relative">
      {children}
    </div>
  );
}
