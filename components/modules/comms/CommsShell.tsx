"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  getConversations,
  getMessages,
  getClientCrmInsight,
  updateConversationStatus,
  classifyMessage,
} from "@/app/(app)/comms/actions";
import type {
  Conversation,
  CommsMessage,
  ChannelType,
  ConversationStatus,
} from "@/lib/types/comms";

import { ThreadList } from "./ThreadList";
import { MessageTimeline } from "./MessageTimeline";
import { CrmInsightPanel } from "./CrmInsightPanel";
import { CreateTaskDialog } from "./dialogs/CreateTaskDialog";
import { CreateProjectDialog } from "./dialogs/CreateProjectDialog";
import { SaveFactDialog } from "./dialogs/SaveFactDialog";
import { AddContactDialog } from "./dialogs/AddContactDialog";
import { SetFollowUpDialog } from "./dialogs/SetFollowUpDialog";
import { LinkClientDialog } from "./dialogs/LinkClientDialog";
import { CreateClientDialog } from "./dialogs/CreateClientDialog";

// ─── Dialog discriminated union ─────────────────────────────────────────────

type DialogState =
  | { type: null }
  | { type: "create_task"; msg?: CommsMessage }
  | { type: "create_project" }
  | { type: "save_fact"; initialValue?: string }
  | { type: "add_contact"; initialName?: string; initialEmail?: string }
  | { type: "set_follow_up" }
  | { type: "link_client" }
  | { type: "create_client"; initialEmail?: string; initialPhone?: string };

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function CommsShell({
  initialConversations = [],
  initialClients = [],
}: {
  initialConversations?: (Conversation & { client_name: string | null })[];
  initialClients?: { id: string; name: string }[];
} = {}) {
  // ── Core state ──────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<(Conversation & { client_name: string | null })[]>(initialConversations);
  const [loading, setLoading] = useState(initialConversations.length === 0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CommsMessage[]>([]);
  const [clientInsight, setClientInsight] = useState<Awaited<ReturnType<typeof getClientCrmInsight>> | null>(null);

  const selected = conversations.find((c) => c.id === selectedId);

  // ── Dialog state ────────────────────────────────────────────────────────────
  const [dialog, setDialog] = useState<DialogState>({ type: null });

  const closeDialog = useCallback(() => setDialog({ type: null }), []);

  // ── Data loading ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (initialConversations.length > 0) return;
    setLoading(true);
    getConversations()
      .then((data) => setConversations(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    const convo = conversations.find((c) => c.id === id);
    getMessages(id).then(setMessages).catch(() => setMessages([]));
    if (convo?.client_id) {
      getClientCrmInsight(convo.client_id).then(setClientInsight).catch(() => setClientInsight(null));
    } else {
      setClientInsight(null);
    }
  }, [conversations]);

  const refreshSelected = useCallback(() => {
    if (!selectedId) return;
    const convo = conversations.find((c) => c.id === selectedId);
    getMessages(selectedId).then(setMessages).catch(() => {});
    if (convo?.client_id) {
      getClientCrmInsight(convo.client_id).then(setClientInsight).catch(() => {});
    }
  }, [selectedId, conversations]);

  // ── Inline message actions ─────────────────────────────────────────────────
  const handleClassifyApproval = useCallback(async (msg: CommsMessage) => {
    try {
      await classifyMessage(msg.id, "approval");
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, classification: "approval" as any } : m));
      toast.success("Message marked as Approval");
    } catch { toast.error("Failed to classify message"); }
  }, []);

  // ── Panel action handlers ──────────────────────────────────────────────────
  const handleMarkResolved = useCallback(async () => {
    if (!selected) return;
    try {
      await updateConversationStatus(selected.id, "resolved");
      setConversations((prev) => prev.map((c) => c.id === selected.id ? { ...c, status: "resolved" as ConversationStatus, is_resolved: true } : c));
      toast.success("Conversation marked as resolved");
    } catch { toast.error("Failed to mark resolved"); }
  }, [selected]);

  const handleCopySourceLink = useCallback(() => {
    const url = `${window.location.origin}/comms?thread=${selected?.id || ""}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Link copied to clipboard")).catch(() => toast.error("Failed to copy"));
  }, [selected]);

  const handleWhatsAppSent = useCallback((msg: { text: string; sender: string }) => {
    if (!selected) return;
    setMessages(prev => [...prev, {
      id: `temp-${Date.now()}`,
      conversation_id: selected.id,
      channel: "whatsapp" as ChannelType,
      client_id: null,
      project_id: null,
      sender_display_name: msg.sender || "Admin",
      sender_identifier: "admin:self",
      body_text: msg.text,
      classification: "general" as const,
      has_attachments: false,
      is_from_client: false,
      source_url: null,
      extracted_entities: null,
      linked_task_ids: [],
      linked_fact_ids: [],
      created_at: new Date().toISOString(),
    }]);
  }, [selected]);

  // ── Dialog openers (from MessageTimeline inline actions) ────────────────────
  const openCreateTaskFromMsg = useCallback((msg: CommsMessage) => {
    setDialog({ type: "create_task", msg });
  }, []);

  const openSaveFactFromMsg = useCallback((msg: CommsMessage) => {
    setDialog({ type: "save_fact", initialValue: msg.body_text.slice(0, 200) });
  }, []);

  const openAddContactFromMsg = useCallback((msg: CommsMessage) => {
    setDialog({ type: "add_contact", initialName: msg.sender_display_name || "", initialEmail: msg.sender_identifier || "" });
  }, []);

  const openSetFollowUpFromMsg = useCallback((_msg: CommsMessage) => {
    setDialog({ type: "set_follow_up" });
  }, []);

  // ── Dialog openers (from CrmInsightPanel action buttons) ───────────────────
  const openCreateClientDialog = useCallback(() => {
    if (!selected) return;
    const firstParticipant = selected.participants?.[0] || "";
    const initialEmail = firstParticipant.includes("@") ? firstParticipant : undefined;
    const initialPhone = firstParticipant.startsWith("+") ? firstParticipant : undefined;
    setDialog({ type: "create_client", initialEmail, initialPhone });
  }, [selected]);

  // ── Client link/create done handlers ───────────────────────────────────────
  const handleClientLinked = useCallback((clientId: string, clientName: string) => {
    if (!selected) return;
    setConversations((prev) => prev.map((c) => c.id === selected.id ? { ...c, client_id: clientId, client_name: clientName } : c));
  }, [selected]);

  const handleClientCreated = useCallback((clientId: string, clientName: string) => {
    if (!selected) return;
    setConversations((prev) => prev.map((c) => c.id === selected.id ? { ...c, client_id: clientId, client_name: clientName } : c));
  }, [selected]);

  // ═══ Render ═══════════════════════════════════════════════════════════════════

  return (
    <div className="flex h-full overflow-hidden rounded-lg border bg-card">
      <ThreadList
        conversations={conversations}
        selectedId={selectedId}
        onSelect={handleSelect}
        loading={loading}
      />

      <MessageTimeline
        selected={selected}
        messages={messages}
        onCreateTask={openCreateTaskFromMsg}
        onSaveFact={openSaveFactFromMsg}
        onAddContact={openAddContactFromMsg}
        onClassifyApproval={handleClassifyApproval}
        onSetFollowUp={openSetFollowUpFromMsg}
        onWhatsAppSent={handleWhatsAppSent}
      />

      <CrmInsightPanel
        selected={selected}
        clientInsight={clientInsight}
        onCreateTask={() => setDialog({ type: "create_task" })}
        onCreateProject={() => setDialog({ type: "create_project" })}
        onSaveFact={() => setDialog({ type: "save_fact" })}
        onAddContact={() => setDialog({ type: "add_contact" })}
        onSetFollowUp={() => setDialog({ type: "set_follow_up" })}
        onMarkResolved={handleMarkResolved}
        onCopySourceLink={handleCopySourceLink}
        onLinkClient={() => setDialog({ type: "link_client" })}
        onCreateClient={openCreateClientDialog}
      />

      {/* ═══ Dialogs ═══ */}

      <CreateTaskDialog
        open={dialog.type === "create_task"}
        onOpenChange={(open) => !open && closeDialog()}
        conversationId={selected?.id || ""}
        clientId={selected?.client_id || null}
        messageId={dialog.type === "create_task" ? dialog.msg?.id : undefined}
        messagePreview={dialog.type === "create_task" ? dialog.msg?.body_text : undefined}
        onTaskCreated={refreshSelected}
      />

      <CreateProjectDialog
        open={dialog.type === "create_project"}
        onOpenChange={(open) => !open && closeDialog()}
        clientId={selected?.client_id || null}
        onProjectCreated={refreshSelected}
      />

      <SaveFactDialog
        open={dialog.type === "save_fact"}
        onOpenChange={(open) => !open && closeDialog()}
        clientId={selected?.client_id || ""}
        clientName={selected?.client_name || "Client"}
        initialValue={dialog.type === "save_fact" ? dialog.initialValue : undefined}
        onFactSaved={refreshSelected}
      />

      <AddContactDialog
        open={dialog.type === "add_contact"}
        onOpenChange={(open) => !open && closeDialog()}
        clientId={selected?.client_id || ""}
        clientName={selected?.client_name || "Client"}
        initialName={dialog.type === "add_contact" ? dialog.initialName : undefined}
        initialEmail={dialog.type === "add_contact" ? dialog.initialEmail : undefined}
        onContactAdded={refreshSelected}
      />

      <SetFollowUpDialog
        open={dialog.type === "set_follow_up"}
        onOpenChange={(open) => !open && closeDialog()}
        conversationId={selected?.id || ""}
        onFollowUpSet={refreshSelected}
      />

      <LinkClientDialog
        open={dialog.type === "link_client"}
        onOpenChange={(open) => !open && closeDialog()}
        conversationId={selected?.id || ""}
        onClientLinked={handleClientLinked}
      />

      <CreateClientDialog
        open={dialog.type === "create_client"}
        onOpenChange={(open) => !open && closeDialog()}
        conversationId={selected?.id || ""}
        initialEmail={dialog.type === "create_client" ? dialog.initialEmail : undefined}
        initialPhone={dialog.type === "create_client" ? dialog.initialPhone : undefined}
        onClientCreated={handleClientCreated}
      />
    </div>
  );
}
