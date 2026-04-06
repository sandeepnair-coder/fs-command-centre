// ─── Channel Adapter Registry ────────────────────────────────────────────────

import type { ChannelAdapter, ChannelProvider } from "@/lib/types/channels";
import { gmailAdapter } from "./gmail";
import { slackAdapter } from "./slack";
import { whatsappAdapter } from "./whatsapp";

const adapters: Record<ChannelProvider, ChannelAdapter> = {
  gmail: gmailAdapter,
  slack: slackAdapter,
  whatsapp: whatsappAdapter,
};

export function getAdapter(provider: ChannelProvider): ChannelAdapter {
  const adapter = adapters[provider];
  if (!adapter) throw new Error(`Unknown provider: ${provider}`);
  return adapter;
}

export { gmailAdapter, slackAdapter, whatsappAdapter };
