"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function WhatsAppReplyBox({ conversationId, onSent }: { conversationId: string; onSent: (msg: { text: string; sender: string }) => void }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    const msg = text.trim();
    if (!msg || sending) return;
    if (msg.length > 4096) { toast.error("Message too long (max 4096 chars)"); return; }

    setSending(true);
    try {
      const res = await fetch("/api/comms/whatsapp/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: msg }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send");
        if (data.status === "failed") {
          toast.info("Message saved — delivery failed. Check logs.");
        }
        return;
      }
      setText("");
      onSent({ text: msg, sender: data.message?.sender_display_name || "Admin" });
      toast.success("Reply sent to WhatsApp");
    } catch {
      toast.error("Network error — could not reach server");
    } finally {
      setSending(false);
    }
  }, [text, sending, conversationId, onSent]);

  return (
    <div className="shrink-0 border-t p-3">
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Reply on WhatsApp..."
          className="flex-1 text-sm"
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={!text.trim() || sending} aria-label="Send reply">
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
      <p className="mt-1 text-[10px] text-muted-foreground">This reply will be sent directly to the user&apos;s WhatsApp.</p>
    </div>
  );
}
