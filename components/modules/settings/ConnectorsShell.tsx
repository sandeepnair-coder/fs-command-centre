"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Plug2,
  Bot,
  ShieldCheck,
  Eye,
  Lightbulb,
  Hand,
  Power,
  Activity,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ListChecks,
  Users,
  MessageSquareText,
  Workflow,
  Columns3,
  Tag,
  UserPlus,
  Link2,
  GitBranch,
  Pencil,
  Trash2,
  Search,
  Building2,
  Brain,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getConnectorConfigs, updateConnectorConfig, getAuditLog } from "@/app/(app)/comms/actions";
import { testOpenClawConnection } from "@/app/(app)/comms/openclaw-actions";
import { CONNECTOR_MODES, CONNECTOR_SCOPES } from "@/lib/types/comms";
import type { ConnectorConfig, ConnectorMode, AuditLogEvent } from "@/lib/types/comms";
import { toast } from "sonner";
import { SUCCESS } from "@/lib/copy";
import { format } from "date-fns";

const MODE_ICONS: Record<string, React.ElementType> = {
  disabled: Power,
  observe_only: Eye,
  suggest_only: Lightbulb,
  human_triggered_actions: Hand,
};

// ─── API Capability Registry ────────────────────────────────────────────────

type ToolInfo = { name: string; endpoint: string; description: string; icon: React.ElementType; category: string };

const API_TOOLS: ToolInfo[] = [
  // Task Card
  { name: "create-project", endpoint: "/api/v1/create-project", description: "Create board + columns + tasks", icon: Columns3, category: "Projects" },
  { name: "create-tasks", endpoint: "/api/v1/create-tasks", description: "Add tasks to a project board", icon: ListChecks, category: "Tasks" },
  { name: "update-task", endpoint: "/api/v1/update-task", description: "Update any task field", icon: Pencil, category: "Tasks" },
  { name: "move-task", endpoint: "/api/v1/move-task", description: "Move card between columns", icon: Columns3, category: "Tasks" },
  { name: "delete-task", endpoint: "/api/v1/delete-task", description: "Remove a task card", icon: Trash2, category: "Tasks" },
  { name: "add-comment", endpoint: "/api/v1/add-comment", description: "Add comment to card", icon: MessageSquareText, category: "Tasks" },
  { name: "manage-tags", endpoint: "/api/v1/manage-tags", description: "Add/remove tags", icon: Tag, category: "Tasks" },
  { name: "manage-assignees", endpoint: "/api/v1/manage-assignees", description: "Assign/unassign members", icon: UserPlus, category: "Tasks" },
  { name: "add-link", endpoint: "/api/v1/add-link", description: "Attach URLs to cards", icon: Link2, category: "Tasks" },
  { name: "manage-dependencies", endpoint: "/api/v1/manage-dependencies", description: "Set blocking relationships", icon: GitBranch, category: "Tasks" },
  // Projects
  { name: "update-project", endpoint: "/api/v1/update-project", description: "Update project status/metadata", icon: Pencil, category: "Projects" },
  { name: "search-projects", endpoint: "/api/v1/search-projects", description: "Find existing projects", icon: Search, category: "Projects" },
  { name: "get-board-context", endpoint: "/api/v1/get-board-context", description: "Read full board state", icon: Columns3, category: "Projects" },
  { name: "manage-columns", endpoint: "/api/v1/manage-columns", description: "Add/rename columns", icon: Columns3, category: "Projects" },
  // Clients
  { name: "upsert-client", endpoint: "/api/v1/upsert-client", description: "Create or update client profile", icon: Building2, category: "Clients" },
  { name: "update-client", endpoint: "/api/v1/update-client", description: "Update client fields", icon: Pencil, category: "Clients" },
  { name: "add-client-contact", endpoint: "/api/v1/add-client-contact", description: "Add contact to client", icon: UserPlus, category: "Clients" },
  { name: "add-client-facts", endpoint: "/api/v1/add-client-facts", description: "Store brand knowledge", icon: Brain, category: "Clients" },
  { name: "get-client-profile", endpoint: "/api/v1/get-client-profile", description: "Read full client profile", icon: Users, category: "Clients" },
  { name: "search-clients", endpoint: "/api/v1/search-clients", description: "Find existing clients", icon: Search, category: "Clients" },
  // Other
  { name: "create-work-stream", endpoint: "/api/v1/create-work-stream", description: "Group related work", icon: Workflow, category: "Other" },
  { name: "list-members", endpoint: "/api/v1/list-members", description: "List team members", icon: Users, category: "Other" },
];

const CATEGORIES = ["Tasks", "Projects", "Clients", "Other"];

export function ConnectorsShell() {
  const [configs, setConfigs] = useState<ConnectorConfig[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAudit, setShowAudit] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{ connected: boolean; status: string; version?: string; protocol?: number } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    Promise.all([
      getConnectorConfigs().catch(() => []),
      getAuditLog({ entity_type: "connector_config", limit: 20 }).catch(() => []),
      testOpenClawConnection().catch(() => ({ connected: false, status: "unreachable" })),
    ]).then(([c, a, h]) => {
      setConfigs(c as ConnectorConfig[]);
      setAuditLog(a);
      setHealthStatus(h);
      setLoading(false);
    });
  }, []);

  async function handleTestConnection() {
    setTesting(true);
    try {
      const result = await testOpenClawConnection();
      setHealthStatus(result);
      if (result.connected) {
        toast.success("Open Claw is connected and responding.");
      } else {
        toast.error(`Open Claw not reachable: ${result.status}`);
      }
    } catch {
      setHealthStatus({ connected: false, status: "unreachable" });
      toast.error("Could not reach Open Claw.");
    } finally {
      setTesting(false);
    }
  }

  async function handleModeChange(config: ConnectorConfig, mode: ConnectorMode) {
    const enabled = mode !== "disabled";
    try {
      const updated = await updateConnectorConfig(config.id, { mode, enabled });
      setConfigs((prev) => prev.map((c) => (c.id === config.id ? (updated as ConnectorConfig) : c)));
      toast.success(SUCCESS.connectorUpdated);
    } catch {
      toast.error("Couldn't update connector. Try again?");
    }
  }

  async function handleScopeToggle(config: ConnectorConfig, scope: string) {
    const current = config.scopes || [];
    const next = current.includes(scope)
      ? current.filter((s) => s !== scope)
      : [...current, scope];
    try {
      const updated = await updateConnectorConfig(config.id, { scopes: next });
      setConfigs((prev) => prev.map((c) => (c.id === config.id ? (updated as ConnectorConfig) : c)));
    } catch {
      toast.error("Scope change didn't save.");
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-64 rounded-xl border bg-muted/30 animate-pulse" />
        <div className="h-64 rounded-xl border bg-muted/30 animate-pulse" />
      </div>
    );
  }

  const openClaw = configs.find((c) => c.connector_key === "open_claw");

  return (
    <div className="space-y-6">
      {/* ─── Connector Cards ─── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Open Claw Card */}
        {openClaw ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40">
                    <Bot className="size-5 text-violet-600 dark:text-violet-300" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Open Claw</CardTitle>
                    <CardDescription className="text-[11px]">AI Intelligence Agent — WhatsApp Gateway</CardDescription>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    healthStatus?.connected
                      ? "border-emerald-300 text-emerald-600"
                      : openClaw.enabled
                        ? "border-amber-300 text-amber-600"
                        : "border-muted text-muted-foreground"
                  )}
                >
                  {healthStatus?.connected
                    ? "Connected"
                    : openClaw.enabled
                      ? "Enabled (offline)"
                      : "Not configured"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Connection Status */}
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium text-foreground/60">Connection Status</p>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleTestConnection} disabled={testing}>
                    {testing ? "Testing..." : "Test Connection"}
                  </Button>
                </div>
                {healthStatus && (
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", healthStatus.connected ? "bg-emerald-500" : "bg-red-500")} />
                    <span className="text-xs">
                      {healthStatus.connected
                        ? `Online${healthStatus.protocol ? ` (protocol v${healthStatus.protocol})` : ""}`
                        : healthStatus.status}
                    </span>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  Gateway: ws://64.23.177.147:18789
                </p>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  API Base: https://studio.fynd.design/api/v1
                </p>
              </div>

              {/* Mode */}
              <div>
                <p className="text-[11px] font-medium text-foreground/60 mb-1.5">Operating Mode</p>
                <Select value={openClaw.mode} onValueChange={(v) => handleModeChange(openClaw, v as ConnectorMode)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    {CONNECTOR_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {CONNECTOR_MODES.find((m) => m.value === openClaw.mode)?.description}
                </p>
              </div>

              {/* Scopes */}
              <div>
                <p className="text-[11px] font-medium text-foreground/60 mb-2">Permissions</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-foreground/40 mb-1">Read</p>
                    <div className="space-y-1">
                      {CONNECTOR_SCOPES.read.map((scope) => (
                        <label key={scope} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/50 cursor-pointer">
                          <input type="checkbox" checked={(openClaw.scopes || []).includes(scope)} onChange={() => handleScopeToggle(openClaw, scope)} className="size-3.5 rounded border-border accent-primary" />
                          <span className="text-xs">{scope.replace("read:", "").replace(/_/g, " ")}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-foreground/40 mb-1">Write</p>
                    <div className="space-y-1">
                      {CONNECTOR_SCOPES.write.map((scope) => (
                        <label key={scope} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/50 cursor-pointer">
                          <input type="checkbox" checked={(openClaw.scopes || []).includes(scope)} onChange={() => handleScopeToggle(openClaw, scope)} className="size-3.5 rounded border-border accent-primary" />
                          <span className="text-xs">{scope.replace("write:", "").replace(/_/g, " ")}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Client-First Rule */}
              <div className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 p-3">
                <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 mb-1">Client-First Rule</p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 text-pretty leading-relaxed">
                  OpenClaw must always search/create a client first before creating projects or tasks. The API rejects any project or task creation without a valid client_id.
                </p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                  Flow: search-clients → upsert-client → create-project → create-tasks
                </p>
              </div>
            </CardContent>

            <CardFooter className="text-[10px] text-muted-foreground">
              <ShieldCheck className="mr-1 size-3" />
              Human-in-control: All agent writes are audit-logged and flagged with created_by_agent.
            </CardFooter>
          </Card>
        ) : (
          <Card className="opacity-50">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted"><Bot className="size-5 text-muted-foreground" /></div>
                <div>
                  <CardTitle className="text-sm">Open Claw</CardTitle>
                  <CardDescription className="text-[11px]">Not available — run the migration first.</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Capabilities Summary Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm">API Capabilities</CardTitle>
                <CardDescription className="text-[11px]">22 endpoints available for OpenClaw</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold tabular-nums">10</p>
                <p className="text-[10px] text-muted-foreground">Task Operations</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold tabular-nums">4</p>
                <p className="text-[10px] text-muted-foreground">Project Operations</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold tabular-nums">6</p>
                <p className="text-[10px] text-muted-foreground">Client Operations</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold tabular-nums">2</p>
                <p className="text-[10px] text-muted-foreground">Other</p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3 text-emerald-500" /> Bearer token authentication
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3 text-emerald-500" /> Zod schema validation on all inputs
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3 text-emerald-500" /> Idempotency keys (24h TTL)
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3 text-emerald-500" /> Full audit trail on all writes
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3 text-emerald-500" /> Client-first enforcement
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3 text-emerald-500" /> Fuzzy name matching for tasks/projects
              </div>
              <div className="flex items-center gap-2 text-xs text-red-500">
                <ShieldCheck className="size-3" /> Finance access blocked
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── API Tools Registry ─── */}
      <div>
        <button onClick={() => setShowTools((p) => !p)} className="flex items-center gap-1.5 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
          <Plug2 className="size-4" /> API Tool Registry ({API_TOOLS.length} endpoints)
          {showTools ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
        {showTools && (
          <div className="mt-3 space-y-4">
            {CATEGORIES.map((cat) => {
              const tools = API_TOOLS.filter((t) => t.category === cat);
              if (tools.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 mb-2">{cat}</p>
                  <div className="space-y-1">
                    {tools.map((tool) => (
                      <div key={tool.name} className="flex items-center gap-3 rounded-lg border bg-card p-2.5">
                        <tool.icon className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium">{tool.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{tool.description}</p>
                        </div>
                        <code className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0 font-mono">
                          POST {tool.endpoint}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Audit Log ─── */}
      <div>
        <button onClick={() => setShowAudit((p) => !p)} className="flex items-center gap-1.5 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
          <Activity className="size-4" /> Connector Audit Log
          {showAudit ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
        {showAudit && (
          <div className="mt-3 space-y-1.5">
            {auditLog.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic">No connector activity recorded yet.</p>
            ) : (
              auditLog.map((e) => (
                <div key={e.id} className="flex items-start gap-2 rounded-lg border bg-card p-2.5">
                  <Activity className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium">{e.event_type.replace(/_/g, " ")}</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {format(new Date(e.created_at), "d MMM yyyy, h:mm a")} · {e.actor_type}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
