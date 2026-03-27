import { Mail } from "lucide-react";

export default function MailPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="h-6 w-6" />
        <h1 className="text-2xl font-bold tracking-tight">Mail</h1>
      </div>
      <p className="text-muted-foreground">
        Gmail-like shared inbox. Coming in Phase 3.
      </p>
    </div>
  );
}
