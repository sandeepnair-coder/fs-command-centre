"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IntakeForm } from "@/lib/types/clients";

interface QuickIntakeTabProps {
  form: IntakeForm;
  updateField: <K extends keyof IntakeForm>(key: K, value: IntakeForm[K]) => void;
  creating: boolean;
  onSubmit: () => void;
}

export function QuickIntakeTab({ form, updateField, creating, onSubmit }: QuickIntakeTabProps) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="quick-name" className="text-sm">
          Client / Brand Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="quick-name"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="e.g. GreenLeaf Organics"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter" && !creating) onSubmit(); }}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm">Email</Label>
          <Input
            value={form.primary_email}
            onChange={(e) => updateField("primary_email", e.target.value)}
            placeholder="hello@client.com"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Website</Label>
          <Input
            value={form.website}
            onChange={(e) => updateField("website", e.target.value)}
            placeholder="www.client.com"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label className="text-sm">Industry</Label>
          <Input
            value={form.industry}
            onChange={(e) => updateField("industry", e.target.value)}
            placeholder="e.g. F&B, Fashion, Tech"
            className="h-9"
          />
        </div>
      </div>
    </div>
  );
}
