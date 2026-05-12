"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ListPlus,
  Bookmark,
  ThumbsUp,
  Paperclip,
  Clock,
  AlertTriangle,
  Building2,
  CalendarClock,
  MessageSquare,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation, CommsMessage, ChannelType } from "@/lib/types/comms";
import {
  CHANNEL_CONFIG,
  CLASSIFICATION_CONFIG,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
} from "@/lib/types/comms";
import { format } from "date-fns";
import { ChannelIcon } from "./ThreadList";
import { WhatsAppReplyBox } from "./WhatsAppReplyBox";

export function MessageTimeline({
  selected,
  messages,
  onCreateTask,
  onSaveFact,
  onAddContact,
  onClassifyApproval,
  onSetFollowUp,
  onWhatsAppSent,
}: {
  selected: (Conversation & { client_name: string | null }) | undefined;
  messages: CommsMessage[];
  onCreateTask: (msg: CommsMessage) => void;
  onSaveFact: (msg: CommsMessage) => void;
  onAddContact: (msg: CommsMessage) => void;
  onClassifyApproval: (msg: CommsMessage) => void;
  onSetFollowUp: (msg: CommsMessage) => void;
  onWhatsAppSent: (msg: { text: string; sender: string }) => void;
}) {
  return (
    <div className="flex flex-1 flex-col min-w-0">
      {selected ? (
        <>
          {/* Thread header */}
          <div className="border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <ChannelIcon channel={selected.channel} className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold truncate text-balance">{selected.subject || "(No subject)"}</h2>
              <Badge variant="outline" className={cn("text-[10px]", STATUS_CONFIG[selected.status].color)}>
                {STATUS_CONFIG[selected.status].label}
              </Badge>
              {selected.priority !== "normal" && (
                <Badge variant="outline" className="text-[10px]">
                  <span className={cn("size-1.5 rounded-full mr-0.5", PRIORITY_CONFIG[selected.priority].dot)} />
                  {PRIORITY_CONFIG[selected.priority].label}
                </Badge>
              )}
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              {selected.client_name ? (
                <Link href={selected.client_id ? `/clients/${selected.client_id}` : "/clients"} className="font-medium text-primary hover:underline flex items-center gap-1">
                  <Building2 className="size-3" /> {selected.client_name}
                </Link>
              ) : (
                <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="size-3" /> Unlinked thread</span>
              )}
              <span className="tabular-nums">{selected.participants.length} participants</span>
              {selected.waiting_on && <span className="flex items-center gap-1"><Clock className="size-3" /> Waiting on {selected.waiting_on}</span>}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1">
            <div className="space-y-3 p-4">
              {messages.map((msg) => (
                <div key={msg.id} className={cn(
                  "flex flex-col max-w-[85%]",
                  msg.is_from_client ? "self-start items-start" : "self-end items-end ml-auto"
                )}>
                  {/* Sender row */}
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className={cn("text-[11px] font-semibold",
                      msg.is_from_client ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400"
                    )}>
                      {msg.sender_display_name || "Unknown"}
                    </span>
                    {!msg.is_from_client && msg.sender_identifier?.startsWith("admin") && (
                      <Badge variant="outline" className="text-[8px] h-3 px-1 border-violet-300 text-violet-600 dark:border-violet-700 dark:text-violet-400">Admin</Badge>
                    )}
                    <Badge variant="outline" className={cn("text-[8px] h-3 px-1", CHANNEL_CONFIG[msg.channel].color)}>
                      {CHANNEL_CONFIG[msg.channel].label}
                    </Badge>
                    {msg.classification && msg.classification !== "general" && (
                      <Badge variant="secondary" className={cn("text-[8px] h-3 px-1", CLASSIFICATION_CONFIG[msg.classification].color)}>
                        {CLASSIFICATION_CONFIG[msg.classification].label}
                      </Badge>
                    )}
                    {msg.has_attachments && <Paperclip className="size-2.5 text-muted-foreground" />}
                  </div>
                  {/* Bubble */}
                  <div className={cn(
                    "rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-wrap text-pretty leading-relaxed",
                    msg.is_from_client
                      ? "bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-foreground rounded-tl-sm"
                      : "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-foreground rounded-tr-sm"
                  )}>
                    {msg.body_text}
                  </div>
                  {/* Timestamp + actions */}
                  <div className="flex items-center gap-1 mt-0.5 px-1">
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {format(new Date(msg.created_at), "d MMM, h:mm a")}
                    </span>
                  </div>
                  {/* Inline actions (on hover) */}
                  <div className="flex flex-wrap gap-1 mt-1 opacity-0 hover:opacity-100 transition-opacity focus-within:opacity-100">
                    <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => onCreateTask(msg)}><ListPlus className="mr-0.5 size-2.5" /> Task</Button>
                    <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => onSaveFact(msg)}><Bookmark className="mr-0.5 size-2.5" /> Fact</Button>
                    <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => onAddContact(msg)}><UserPlus className="mr-0.5 size-2.5" /> Contact</Button>
                    <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => onClassifyApproval(msg)}><ThumbsUp className="mr-0.5 size-2.5" /> Approval</Button>
                    <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => onSetFollowUp(msg)}><CalendarClock className="mr-0.5 size-2.5" /> Follow-up</Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Reply box for WhatsApp conversations */}
          {selected.channel === "whatsapp" && (
            <WhatsAppReplyBox conversationId={selected.id} onSent={onWhatsAppSent} />
          )}
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
          <MessageSquare className="mb-2 size-10" />
          <p className="text-sm font-medium">Select a conversation</p>
          <p className="mt-1 text-xs text-pretty">Pick a thread to see the timeline, client context, and actions.</p>
        </div>
      )}
    </div>
  );
}
