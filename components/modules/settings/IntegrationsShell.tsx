"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Hash,
  Phone,
  RefreshCw,
  Unplug,
  Plug2,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Settings,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Save,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import {
  getChannelConnections,
  getProviderConfigStatuses,
  saveProviderConfig,
  clearProviderConfig,
  getOAuthUrl,
  connectWhatsApp,
  disconnectChannel,
  updateConnectionConfig,
  getChannelSources,
  refreshAvailableSources,
  toggleSource,
  triggerBackfill,
  triggerSync,
  getSyncJobs,
} from "@/app/(app)/settings/integrations/actions";
import type { ProviderConfigStatus } from "@/app/(app)/settings/integrations/actions";
import {
  PROVIDER_CONFIG,
  CONNECTION_STATUS_CONFIG,
  SYNC_HEALTH_CONFIG,
} from "@/lib/channels/types";
import type {
  ChannelConnection,
  ChannelProvider,
  ChannelSource,
  SyncJob,
} from "@/lib/channels/types";

const PROVIDER_ICONS: Record<ChannelProvider, React.ElementType> = {
  gmail: Mail,
  slack: Hash,
  whatsapp: Phone,
};

const BACKFILL_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

// ─── Setup Instructions Per Provider ────────────────────────────────────────

const SETUP_INSTRUCTIONS: Record<ChannelProvider, {
  fields: { key: string; label: string; placeholder: string; secret?: boolean }[];
  steps: string[];
  consoleUrl: string;
  consoleName: string;
}> = {
  gmail: {
    fields: [
      { key: "client_id", label: "Google Client ID", placeholder: "123456789.apps.googleusercontent.com" },
      { key: "client_secret", label: "Google Client Secret", placeholder: "GOCSPX-...", secret: true },
    ],
    steps: [
      "Go to Google Cloud Console > APIs & Services > Credentials",
      "Create an OAuth 2.0 Client ID (Web application type)",
      'Add this redirect URI: {origin}/api/channels/google/callback',
      "Enable the Gmail API under APIs & Services > Library",
      "Copy the Client ID and Client Secret here",
    ],
    consoleUrl: "https://console.cloud.google.com/apis/credentials",
    consoleName: "Google Cloud Console",
  },
  slack: {
    fields: [
      { key: "client_id", label: "Slack Client ID", placeholder: "123456789.123456789" },
      { key: "client_secret", label: "Slack Client Secret", placeholder: "abc123...", secret: true },
      { key: "signing_secret", label: "Signing Secret (for webhooks)", placeholder: "abc123...", secret: true },
    ],
    steps: [
      "Go to api.slack.com/apps and create a new app",
      "Under OAuth & Permissions, add bot scopes: channels:history, channels:read, users:read, users:read.email, team:read",
      'Add this redirect URL: {origin}/api/channels/slack/callback',
      'Under Event Subscriptions, set Request URL to: {origin}/api/channels/webhooks/slack',
      "Copy the Client ID, Client Secret, and Signing Secret here",
    ],
    consoleUrl: "https://api.slack.com/apps",
    consoleName: "Slack API Dashboard",
  },
  whatsapp: {
    fields: [
      { key: "business_number", label: "WhatsApp Business Number", placeholder: "+919876543210" },
      { key: "verify_token", label: "Webhook Verify Token", placeholder: "your-custom-verify-token" },
      { key: "access_token", label: "Permanent Access Token (optional)", placeholder: "EAAx...", secret: true },
    ],
    steps: [
      "Go to Meta Developer Portal > Your App > WhatsApp > Configuration",
      'Set Webhook URL to: {origin}/api/channels/webhooks/whatsapp',
      "Enter the Verify Token you choose below (any string you pick)",
      "Subscribe to: messages, message_template_status_update",
      "Enter your WhatsApp Business number and save",
    ],
    consoleUrl: "https://developers.facebook.com/apps/",
    consoleName: "Meta Developer Portal",
  },
};

// ─── Provider Card ──────────────────────────────────────────────────────────

type ProviderCardProps = {
  provider: ChannelProvider;
  connection: ChannelConnection | null;
  configStatus: ProviderConfigStatus;
  onConfigSaved: () => void;
  onConnect: (provider: ChannelProvider) => void;
  onDisconnect: (connectionId: string) => void;
  onSync: (connectionId: string) => void;
  onBackfill: (connectionId: string) => void;
  onConfigChange: (connectionId: string, updates: { backfill_days?: number; auto_link_enabled?: boolean }) => void;
  connecting: boolean;
};

function ProviderCard({
  provider,
  connection,
  configStatus,
  onConfigSaved,
  onConnect,
  onDisconnect,
  onSync,
  onBackfill,
  onConfigChange,
  connecting,
}: ProviderCardProps) {
  const uiConfig = PROVIDER_CONFIG[provider];
  const setupInfo = SETUP_INSTRUCTIONS[provider];
  const Icon = PROVIDER_ICONS[provider];
  const isConnected = connection && connection.status !== "disconnected";
  const isConfigured = configStatus.is_configured;
  const statusConfig = connection ? CONNECTION_STATUS_CONFIG[connection.status] : null;
  const healthConfig = connection ? SYNC_HEALTH_CONFIG[connection.sync_health] : null;

  // Setup form state
  const [showSetup, setShowSetup] = useState(!isConfigured && !isConnected);
  const [setupForm, setSetupForm] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  // Expanded details
  const [expanded, setExpanded] = useState(false);
  const [sources, setSources] = useState<ChannelSource[]>([]);
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://your-app.com";

  const loadDetails = useCallback(async () => {
    if (!connection) return;
    try {
      const [s, j] = await Promise.all([
        getChannelSources(connection.id),
        getSyncJobs(connection.id, 5),
      ]);
      setSources(s);
      setSyncJobs(j);
    } catch { /* ignore */ }
  }, [connection]);

  useEffect(() => {
    if (expanded && connection) loadDetails();
  }, [expanded, connection, loadDetails]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await saveProviderConfig(provider, setupForm);
      toast.success(`${uiConfig.label} credentials saved`);
      onConfigSaved();
      setShowSetup(false);
      setSetupForm({});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save credentials");
    } finally {
      setSaving(false);
    }
  };

  const handleClearConfig = async () => {
    try {
      await clearProviderConfig(provider);
      toast.success(`${uiConfig.label} credentials removed`);
      onConfigSaved();
      setShowSetup(true);
    } catch {
      toast.error("Failed to clear config");
    }
  };

  const handleRefreshSources = async () => {
    if (!connection) return;
    setLoadingSources(true);
    try {
      const updated = await refreshAvailableSources(connection.id);
      setSources(updated);
      toast.success("Sources refreshed");
    } catch {
      toast.error("Failed to refresh sources");
    } finally {
      setLoadingSources(false);
    }
  };

  const handleToggleSource = async (sourceId: string, enabled: boolean) => {
    try {
      await toggleSource(sourceId, enabled);
      setSources((prev) => prev.map((s) => s.id === sourceId ? { ...s, is_enabled: enabled } : s));
    } catch {
      toast.error("Failed to update source");
    }
  };

  // ─── Determine what to show ───────────────────────────────────────────────

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={cn("flex size-9 items-center justify-center rounded-lg", uiConfig.iconBg)}>
              <Icon className={cn("size-5", uiConfig.color)} />
            </div>
            <div>
              <CardTitle className="text-sm">{uiConfig.label}</CardTitle>
              <CardDescription className="text-[11px]">{uiConfig.description}</CardDescription>
            </div>
          </div>
          {isConnected && statusConfig ? (
            <Badge variant="outline" className={cn("text-[10px]", statusConfig.color)}>
              <span className={cn("size-1.5 rounded-full mr-1", statusConfig.dot)} />
              {statusConfig.label}
            </Badge>
          ) : isConfigured ? (
            <Badge variant="outline" className="text-[10px] text-amber-600">
              Ready to connect
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              Setup required
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* ─── STEP 1: Setup / Configure Credentials ─── */}
        {(showSetup || (!isConfigured && !isConnected)) && (
          <div className="space-y-3">
            {/* Instructions */}
            <div className="rounded-lg border border-dashed p-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">Setup Steps</p>
              <ol className="space-y-1.5">
                {setupInfo.steps.map((step, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground flex gap-2">
                    <span className="text-foreground/40 font-mono shrink-0 tabular-nums">{i + 1}.</span>
                    <span className="text-pretty">{step.replace("{origin}", origin)}</span>
                  </li>
                ))}
              </ol>
              {setupInfo.consoleUrl && (
                <a
                  href={setupInfo.consoleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                >
                  <ExternalLink className="size-3" /> Open {setupInfo.consoleName}
                </a>
              )}
            </div>

            {/* Credential Fields */}
            <div className="space-y-2">
              {setupInfo.fields.map((field) => (
                <div key={field.key}>
                  <Label htmlFor={`${provider}-${field.key}`} className="text-xs">{field.label}</Label>
                  <div className="relative mt-1">
                    <Input
                      id={`${provider}-${field.key}`}
                      type={field.secret && !showSecrets[field.key] ? "password" : "text"}
                      value={setupForm[field.key] || ""}
                      onChange={(e) => setSetupForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="h-8 text-xs pr-8 font-mono"
                    />
                    {field.secret && (
                      <button
                        type="button"
                        onClick={() => setShowSecrets((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showSecrets[field.key] ? "Hide" : "Show"}
                      >
                        {showSecrets[field.key] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-8 text-xs flex-1"
                onClick={handleSaveConfig}
                disabled={saving || setupInfo.fields.some((f) => !f.secret && !setupForm[f.key]?.trim())}
              >
                <Save className="mr-1 size-3" /> {saving ? "Saving..." : "Save Credentials"}
              </Button>
              {isConfigured && (
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowSetup(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ─── STEP 2: Connect (credentials saved, not yet connected) ─── */}
        {isConfigured && !isConnected && !showSetup && (
          <div className="space-y-3">
            <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-900/10 p-3 flex items-start gap-2">
              <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Credentials configured</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Fields set: {configStatus.fields_set.join(", ")}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-8 text-xs flex-1"
                onClick={() => onConnect(provider)}
                disabled={connecting}
              >
                <Plug2 className="mr-1.5 size-3.5" />
                {connecting ? "Connecting..." : `Connect ${uiConfig.label}`}
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowSetup(true)}>
                <Settings className="mr-1 size-3" /> Edit
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs text-red-600" onClick={handleClearConfig}>
                <Trash2 className="size-3" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Connected — show status + controls ─── */}
        {isConnected && connection && !showSetup && (
          <>
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-foreground/60">Account</p>
                <p className="text-xs font-medium">{connection.display_name}</p>
              </div>
              {connection.provider_account_id && (
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium text-foreground/60">ID</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{connection.provider_account_id}</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-foreground/60">Sync Health</p>
                {healthConfig && (
                  <span className={cn("text-xs font-medium", healthConfig.color)}>
                    {healthConfig.label}
                  </span>
                )}
              </div>
              {connection.last_sync_at && (
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium text-foreground/60">Last Sync</p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    {formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })}
                  </p>
                </div>
              )}
              {connection.last_error && (
                <div className="mt-1 rounded bg-red-50 dark:bg-red-900/10 p-2 flex items-start gap-1.5">
                  <AlertTriangle className="size-3 shrink-0 mt-0.5 text-red-500" />
                  <p className="text-[10px] text-red-600 dark:text-red-400">{connection.last_error}</p>
                </div>
              )}
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground tabular-nums">
                <span>{connection.messages_synced_count} messages</span>
                <span>{connection.conversations_synced_count} conversations</span>
              </div>
            </div>

            {/* Config */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-foreground/60">Backfill Range</p>
                <Select
                  value={String(connection.backfill_days)}
                  onValueChange={(v) => onConfigChange(connection.id, { backfill_days: parseInt(v) })}
                >
                  <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BACKFILL_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-foreground/60">Auto-link to Clients</p>
                <button
                  onClick={() => onConfigChange(connection.id, { auto_link_enabled: !connection.auto_link_enabled })}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    connection.auto_link_enabled ? "bg-primary" : "bg-muted"
                  )}
                  role="switch"
                  aria-checked={connection.auto_link_enabled}
                  aria-label="Toggle auto-link"
                >
                  <span className={cn(
                    "pointer-events-none inline-block size-4 rounded-full bg-background shadow-sm transition-transform",
                    connection.auto_link_enabled ? "translate-x-4" : "translate-x-0"
                  )} />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => onSync(connection.id)}>
                <RefreshCw className="mr-1 size-3" /> Re-sync
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => onBackfill(connection.id)}>
                <Clock className="mr-1 size-3" /> Backfill
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700" onClick={() => onDisconnect(connection.id)}>
                <Unplug className="mr-1 size-3" /> Disconnect
              </Button>
            </div>

            {/* Expandable: Sources & Sync History */}
            <button
              onClick={() => setExpanded((p) => !p)}
              className="flex w-full items-center gap-1 text-[11px] font-medium text-foreground/50 hover:text-foreground transition-colors"
            >
              <Settings className="size-3" />
              {provider === "slack" ? "Channels" : "Sources"} & Sync History
              {expanded ? <ChevronUp className="size-3 ml-auto" /> : <ChevronDown className="size-3 ml-auto" />}
            </button>

            {expanded && (
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
                      {provider === "slack" ? "Channels" : "Sources"}
                    </p>
                    {provider !== "whatsapp" && (
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={handleRefreshSources} disabled={loadingSources}>
                        <RefreshCw className={cn("mr-0.5 size-2.5", loadingSources && "animate-spin")} />
                        {loadingSources ? "Loading..." : "Refresh"}
                      </Button>
                    )}
                  </div>
                  {sources.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground italic">No sources configured</p>
                  ) : (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {sources.map((s) => (
                        <label key={s.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={s.is_enabled}
                            onChange={() => handleToggleSource(s.id, !s.is_enabled)}
                            className="size-3 rounded border-border accent-primary"
                          />
                          <span className="text-xs truncate">{s.name}</span>
                          <span className="text-[9px] text-muted-foreground ml-auto">{s.source_type}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40 mb-1.5">Sync History</p>
                  {syncJobs.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground italic">No sync jobs yet</p>
                  ) : (
                    <div className="space-y-1">
                      {syncJobs.map((j) => (
                        <div key={j.id} className="flex items-center gap-2 rounded border p-2">
                          <span className={cn(
                            "size-1.5 rounded-full shrink-0",
                            j.status === "completed" ? "bg-emerald-500" :
                            j.status === "running" ? "bg-blue-500" :
                            j.status === "failed" ? "bg-red-500" : "bg-gray-400"
                          )} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-medium">{j.job_type}</p>
                            <p className="text-[9px] text-muted-foreground tabular-nums">
                              {j.messages_processed} msgs
                              {j.completed_at && ` - ${formatDistanceToNow(new Date(j.completed_at), { addSuffix: true })}`}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[8px] h-4">{j.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Edit credentials */}
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-muted-foreground" onClick={() => setShowSetup(true)}>
                  <Settings className="mr-1 size-2.5" /> Edit API Credentials
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>

      <CardFooter className="text-[10px] text-muted-foreground">
        {isConnected ? (
          <div className="flex items-center gap-1">
            <CheckCircle2 className="size-3 text-emerald-500" />
            Connected {connection?.created_at && format(new Date(connection.created_at), "d MMM yyyy")}
          </div>
        ) : isConfigured ? (
          <div className="flex items-center gap-1">
            <Activity className="size-3 text-amber-500" />
            Credentials saved — click Connect to authenticate
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Activity className="size-3" />
            {provider === "whatsapp" ? "Enter your OpenClaw WhatsApp number" : "Enter API credentials to get started"}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

// ─── Main Shell ─────────────────────────────────────────────────────────────

export function IntegrationsShell() {
  const [connections, setConnections] = useState<ChannelConnection[]>([]);
  const [configStatuses, setConfigStatuses] = useState<ProviderConfigStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<ChannelProvider | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [conns, configs] = await Promise.all([
        getChannelConnections(),
        getProviderConfigStatuses(),
      ]);
      setConnections(conns);
      setConfigStatuses(configs);
    } catch {
      // Tables might not exist yet
      setConfigStatuses([
        { provider: "gmail", is_configured: false, fields_set: [] },
        { provider: "slack", is_configured: false, fields_set: [] },
        { provider: "whatsapp", is_configured: false, fields_set: [] },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getConnection = (provider: ChannelProvider) =>
    connections.find((c) => c.provider === provider && c.status !== "disconnected") || null;

  const getConfigStatus = (provider: ChannelProvider) =>
    configStatuses.find((c) => c.provider === provider) || { provider, is_configured: false, fields_set: [] };

  const handleConnect = async (provider: ChannelProvider) => {
    setConnecting(provider);
    try {
      if (provider === "whatsapp") {
        const conn = await connectWhatsApp();
        setConnections((prev) => [...prev.filter((c) => c.provider !== "whatsapp"), conn]);
        toast.success("WhatsApp connected via OpenClaw");
      } else {
        const url = await getOAuthUrl(provider);
        window.location.href = url;
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `Failed to connect ${provider}`);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      await disconnectChannel(connectionId);
      setConnections((prev) => prev.map((c) => c.id === connectionId ? { ...c, status: "disconnected" as const } : c));
      toast.success("Channel disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const handleSync = async (connectionId: string) => {
    try {
      await triggerSync(connectionId);
      toast.success("Sync started");
      setConnections((prev) => prev.map((c) =>
        c.id === connectionId ? { ...c, sync_health: "syncing" as const } : c
      ));
    } catch {
      toast.error("Failed to start sync");
    }
  };

  const handleBackfill = async (connectionId: string) => {
    try {
      await triggerBackfill(connectionId);
      toast.success("Backfill started — this may take a few minutes");
      setConnections((prev) => prev.map((c) =>
        c.id === connectionId ? { ...c, status: "syncing" as const, sync_health: "syncing" as const } : c
      ));
    } catch {
      toast.error("Failed to start backfill");
    }
  };

  const handleConfigChange = async (connectionId: string, updates: { backfill_days?: number; auto_link_enabled?: boolean }) => {
    try {
      const updated = await updateConnectionConfig(connectionId, updates);
      setConnections((prev) => prev.map((c) => c.id === connectionId ? updated : c));
    } catch {
      toast.error("Failed to update config");
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-72 rounded-xl border bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  const providers: ChannelProvider[] = ["gmail", "slack", "whatsapp"];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {providers.map((provider) => (
        <ProviderCard
          key={provider}
          provider={provider}
          connection={getConnection(provider)}
          configStatus={getConfigStatus(provider)}
          onConfigSaved={loadData}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onSync={handleSync}
          onBackfill={handleBackfill}
          onConfigChange={handleConfigChange}
          connecting={connecting === provider}
        />
      ))}
    </div>
  );
}
