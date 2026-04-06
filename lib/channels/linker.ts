// ─── Client Auto-Linker ──────────────────────────────────────────────────────
// Resolves external identifiers (email, phone, Slack ID) to clients.

import { createClient } from "@/lib/supabase/server";
import type { ChannelProvider } from "@/lib/types/channels";

type ResolvedIdentity = {
  client_id: string | null;
  client_contact_id: string | null;
  is_team_member: boolean;
  display_name: string | null;
} | null;

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("91") && digits.length >= 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

/**
 * Resolve an external identifier to a client.
 * Checks in order:
 * 1. External identities table (cached from previous resolutions)
 * 2. Client contacts (email/phone match)
 * 3. Client primary_email / phone
 * 4. Team members
 */
export async function resolveClientForIdentifier(
  provider: ChannelProvider,
  identifier: string,
): Promise<ResolvedIdentity> {
  const supabase = await createClient();

  // 1. Check cached external identity
  const { data: existing } = await supabase
    .from("external_identities")
    .select("client_id, client_contact_id, is_team_member, display_name")
    .eq("provider", provider)
    .eq("identifier", identifier)
    .maybeSingle();

  if (existing && (existing.client_id || existing.is_team_member)) {
    return existing;
  }

  // 2. Check client contacts
  if (provider === "gmail") {
    const email = identifier.toLowerCase();
    const { data: contact } = await supabase
      .from("client_contacts")
      .select("id, client_id, name")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

    if (contact) {
      // Cache the resolution
      await cacheIdentity(supabase, provider, identifier, "email", contact.name, contact.client_id, contact.id, false);
      return { client_id: contact.client_id, client_contact_id: contact.id, is_team_member: false, display_name: contact.name };
    }

    // 2b. Check client primary_email
    const { data: client } = await supabase
      .from("clients")
      .select("id, name")
      .ilike("primary_email", email)
      .limit(1)
      .maybeSingle();

    if (client) {
      await cacheIdentity(supabase, provider, identifier, "email", client.name, client.id, null, false);
      return { client_id: client.id, client_contact_id: null, is_team_member: false, display_name: client.name };
    }
  }

  if (provider === "whatsapp") {
    const phone = normalizePhone(identifier);
    // Check contacts with phone
    const { data: contact } = await supabase
      .from("client_contacts")
      .select("id, client_id, name")
      .eq("phone", phone)
      .limit(1)
      .maybeSingle();

    if (contact) {
      await cacheIdentity(supabase, provider, phone, "phone", contact.name, contact.client_id, contact.id, false);
      return { client_id: contact.client_id, client_contact_id: contact.id, is_team_member: false, display_name: contact.name };
    }

    // Check client phone
    const { data: client } = await supabase
      .from("clients")
      .select("id, name")
      .eq("phone", phone)
      .limit(1)
      .maybeSingle();

    if (client) {
      await cacheIdentity(supabase, provider, phone, "phone", client.name, client.id, null, false);
      return { client_id: client.id, client_contact_id: null, is_team_member: false, display_name: client.name };
    }
  }

  // 3. Check if sender is a team member
  if (provider === "gmail") {
    const { data: member } = await supabase
      .from("members")
      .select("id, full_name, email")
      .ilike("email", identifier.toLowerCase())
      .limit(1)
      .maybeSingle();

    if (member) {
      await cacheIdentity(supabase, provider, identifier, "email", member.full_name, null, null, true, member.id);
      return { client_id: null, client_contact_id: null, is_team_member: true, display_name: member.full_name };
    }
  }

  return null;
}

/**
 * Manually link a conversation to a client, and persist the identity mappings.
 */
export async function manuallyLinkConversation(
  conversationId: string,
  clientId: string,
  memberId: string | null,
) {
  const supabase = await createClient();

  // Update conversation
  await supabase.from("conversations").update({
    client_id: clientId,
    updated_at: new Date().toISOString(),
  }).eq("id", conversationId);

  // Update all messages in this conversation
  await supabase.from("comms_messages").update({
    client_id: clientId,
  }).eq("conversation_id", conversationId);

  // Get conversation details for identity mapping
  const { data: convo } = await supabase
    .from("conversations")
    .select("channel, participants, channel_connection_id")
    .eq("id", conversationId)
    .single();

  if (convo) {
    const provider = convo.channel as ChannelProvider;
    // Cache the participant→client mapping for future auto-linking
    for (const participant of convo.participants || []) {
      await supabase.from("external_identities").upsert({
        provider,
        identifier: participant,
        identifier_type: provider === "gmail" ? "email" : provider === "whatsapp" ? "phone" : "slack_user_id",
        client_id: clientId,
        resolved_at: new Date().toISOString(),
        resolved_by: memberId,
        updated_at: new Date().toISOString(),
      }, { onConflict: "provider,identifier", ignoreDuplicates: false });
    }
  }

  // Audit
  await supabase.from("audit_log_events").insert({
    actor_type: "user",
    actor_id: memberId,
    event_type: "conversation_manually_linked",
    entity_type: "conversation",
    entity_id: conversationId,
    metadata_json: JSON.stringify({ client_id: clientId }),
  });
}

// ─── Helper: cache identity resolution ──────────────────────────────────────

async function cacheIdentity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  provider: ChannelProvider,
  identifier: string,
  identifierType: string,
  displayName: string | null,
  clientId: string | null,
  clientContactId: string | null,
  isTeamMember: boolean,
  memberId?: string,
) {
  await supabase.from("external_identities").upsert({
    provider,
    identifier,
    identifier_type: identifierType,
    display_name: displayName,
    client_id: clientId,
    client_contact_id: clientContactId,
    is_team_member: isTeamMember,
    member_id: memberId || null,
    resolved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "provider,identifier", ignoreDuplicates: false });
}
